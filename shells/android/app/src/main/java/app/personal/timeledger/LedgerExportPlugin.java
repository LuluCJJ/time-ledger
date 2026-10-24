package app.personal.timeledger;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.content.ContentValues;
import android.content.ContentResolver;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.io.OutputStream;
import java.io.InputStream;
import java.io.FileOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;

@CapacitorPlugin(name = "LedgerExport")
public class LedgerExportPlugin extends Plugin {
    private static final String EXPORT_PREFS = "ledger-recent-export";

    private File pendingFile() {
        return new File(getContext().getFilesDir(), "pending-ledger-export.bin");
    }

    @PluginMethod
    public void saveFile(PluginCall call) {
        String name = call.getString("name");
        String content = call.getString("content");
        String base64 = call.getString("base64");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        if (name == null || name.isEmpty() || name.contains("/") || name.contains("\\") || (content == null) == (base64 == null)) {
            call.reject("导出文件参数无效");
            return;
        }
        byte[] bytes;
        try {
            bytes = base64 == null ? content.getBytes(StandardCharsets.UTF_8) : Base64.decode(base64, Base64.DEFAULT);
        } catch (IllegalArgumentException error) {
            call.reject("导出表格内容无效");
            return;
        }
        if (bytes.length == 0) {
            call.reject("导出内容为空；没有生成有效备份");
            return;
        }
        // On Android 10+, write into Downloads without opening another Activity.
        // This also avoids device-specific crashes while returning from the file picker.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            saveToDownloads(call, name, mimeType, bytes);
            return;
        }
        // Stage a private copy before DocumentsUI opens. Some phones recreate the
        // Activity while the picker is visible and the resumed PluginCall loses options.
        try (FileOutputStream staged = new FileOutputStream(pendingFile())) {
            staged.write(bytes);
            staged.getFD().sync();
        } catch (Exception error) {
            call.reject("无法准备导出数据：" + error.getMessage());
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, name);
        startActivityForResult(call, intent, "onFileChosen");
    }

    @PluginMethod
    public void openRecentExport(PluginCall call) {
        launchRecentExport(call, false);
    }

    @PluginMethod
    public void shareRecentExport(PluginCall call) {
        launchRecentExport(call, true);
    }

    private void launchRecentExport(PluginCall call, boolean share) {
        SharedPreferences recent = getContext().getSharedPreferences(EXPORT_PREFS, Activity.MODE_PRIVATE);
        String savedUri = recent.getString("uri", null);
        String mimeType = recent.getString("mimeType", null);
        if (savedUri == null || mimeType == null) {
            call.reject("请先从本应用重新导出一个文件");
            return;
        }
        try {
            Uri uri = Uri.parse(savedUri);
            try (InputStream stream = getContext().getContentResolver().openInputStream(uri)) {
                if (stream == null || stream.read() == -1) throw new IllegalStateException("导出文件已不存在或为空");
            }
            Intent intent = new Intent(share ? Intent.ACTION_SEND : Intent.ACTION_VIEW);
            if (share) {
                intent.setType(mimeType);
                intent.putExtra(Intent.EXTRA_STREAM, uri);
            } else {
                intent.setDataAndType(uri, mimeType);
            }
            intent.setClipData(ClipData.newRawUri(recent.getString("name", "时间账导出"), uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(intent, share ? "分享时间账导出文件" : "打开时间账导出文件");
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);
            call.resolve();
        } catch (Exception error) {
            call.reject("无法访问最近导出的文件；请从文件管理器打开“下载/TimeLedger”，或重新导出");
        }
    }

    private void rememberExport(Uri uri, String name, String mimeType) {
        getContext().getSharedPreferences(EXPORT_PREFS, Activity.MODE_PRIVATE).edit()
            .putString("uri", uri.toString()).putString("name", name)
            .putString("mimeType", mimeType).apply();
    }

    private void saveToDownloads(PluginCall call, String name, String mimeType, byte[] bytes) {
        ContentResolver resolver = getContext().getContentResolver();
        Uri uri = null;
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/TimeLedger");
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);
            uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("无法在下载目录建立文件");
            try {
                writeAndSync(uri, bytes);
            } catch (Exception descriptorError) {
                writeWithStream(uri, bytes);
            }
            if (!matchesExport(uri, bytes)) throw new IllegalStateException("文件读回内容与导出内容不一致");
            ContentValues ready = new ContentValues();
            ready.put(MediaStore.MediaColumns.IS_PENDING, 0);
            if (resolver.update(uri, ready, null, null) != 1) throw new IllegalStateException("文件未能完成保存");
            rememberExport(uri, name, mimeType);
            JSObject response = new JSObject();
            response.put("saved", true);
            response.put("verified", true);
            response.put("name", name);
            response.put("bytes", bytes.length);
            response.put("location", "Download/TimeLedger");
            call.resolve(response);
        } catch (Exception error) {
            if (uri != null) {
                try { resolver.delete(uri, null, null); } catch (Exception ignored) { /* Keep the original error. */ }
            }
            call.reject("导出未完成：" + error.getMessage() + "。应用内原记录仍保留");
        }
    }

    @ActivityCallback
    private void onFileChosen(PluginCall call, androidx.activity.result.ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            pendingFile().delete();
            JSObject response = new JSObject();
            response.put("saved", false);
            call.resolve(response);
            return;
        }
        Uri uri = result.getData().getData();
        byte[] bytes;
        try (FileInputStream staged = new FileInputStream(pendingFile()); ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
            byte[] chunk = new byte[8192];
            int count;
            while ((count = staged.read(chunk)) != -1) buffer.write(chunk, 0, count);
            bytes = buffer.toByteArray();
            if (bytes.length == 0) throw new IllegalStateException("应用内部的导出副本为空");
        } catch (Exception error) {
            call.reject("无法读取待导出的数据：" + error.getMessage() + "。请保留应用中的原记录");
            return;
        }
        try {
            try {
                writeAndSync(uri, bytes);
            } catch (Exception descriptorError) {
                writeWithStream(uri, bytes);
            }
            if (!matchesExport(uri, bytes)) {
                // Some document providers acknowledge a write but leave a zero-byte file.
                // A second write through ContentResolver gives such providers another path.
                writeWithStream(uri, bytes);
                if (!matchesExport(uri, bytes)) throw new IllegalStateException("文件读回内容与导出内容不一致，不能作为备份");
            }
        } catch (Exception error) {
            call.reject("导出未验证成功：" + error.getMessage() + "。所选位置可能留下空文件，请保留应用中的原记录并换一个文件夹重试");
            return;
        }
        JSObject response = new JSObject();
        response.put("saved", true);
        response.put("verified", true);
        response.put("name", call.getString("name"));
        response.put("bytes", bytes.length);
        pendingFile().delete();
        try {
            int readFlag = result.getData().getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION;
            if (readFlag != 0) getContext().getContentResolver().takePersistableUriPermission(uri, readFlag);
        } catch (SecurityException ignored) { /* The current session can still open the selected document. */ }
        rememberExport(uri, call.getString("name", "时间账导出"), call.getString("mimeType", "application/octet-stream"));
        call.resolve(response);
    }

    private void writeAndSync(Uri uri, byte[] bytes) throws Exception {
        try (ParcelFileDescriptor descriptor = getContext().getContentResolver().openFileDescriptor(uri, "rwt")) {
            if (descriptor == null) throw new IllegalStateException("无法打开所选位置");
            try (FileOutputStream stream = new FileOutputStream(descriptor.getFileDescriptor())) {
                stream.write(bytes);
                stream.flush();
                stream.getFD().sync();
            }
        }
    }

    private void writeWithStream(Uri uri, byte[] bytes) throws Exception {
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (stream == null) throw new IllegalStateException("无法打开所选位置写入");
            stream.write(bytes);
            stream.flush();
        }
    }

    private boolean matchesExport(Uri uri, byte[] bytes) throws Exception {
        try (InputStream stream = getContext().getContentResolver().openInputStream(uri)) {
            if (stream == null) throw new IllegalStateException("无法重新打开文件读回校验");
            MessageDigest expected = MessageDigest.getInstance("SHA-256");
            MessageDigest actual = MessageDigest.getInstance("SHA-256");
            expected.update(bytes);
            byte[] buffer = new byte[8192];
            long readBytes = 0;
            int count;
            while ((count = stream.read(buffer)) != -1) {
                actual.update(buffer, 0, count);
                readBytes += count;
            }
            return readBytes == bytes.length && Arrays.equals(expected.digest(), actual.digest());
        }
    }
}
