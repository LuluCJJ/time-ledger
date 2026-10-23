package app.personal.timeledger;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "LedgerExport")
public class LedgerExportPlugin extends Plugin {
    @PluginMethod
    public void saveFile(PluginCall call) {
        String name = call.getString("name");
        String content = call.getString("content");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        if (name == null || name.isEmpty() || name.contains("/") || name.contains("\\") || content == null) {
            call.reject("导出文件参数无效");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, name);
        startActivityForResult(call, intent, "onFileChosen");
    }

    @ActivityCallback
    private void onFileChosen(PluginCall call, androidx.activity.result.ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject response = new JSObject();
            response.put("saved", false);
            call.resolve(response);
            return;
        }
        Uri uri = result.getData().getData();
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (stream == null) throw new IllegalStateException("无法打开所选位置");
            byte[] bytes = call.getString("content").getBytes(StandardCharsets.UTF_8);
            stream.write(bytes);
            stream.flush();
            JSObject response = new JSObject();
            response.put("saved", true);
            response.put("name", call.getString("name"));
            response.put("bytes", bytes.length);
            call.resolve(response);
        } catch (Exception error) {
            call.reject("写入文件失败：" + error.getMessage());
        }
    }
}
