package app.personal.timeledger;

import android.content.pm.ActivityInfo;
import android.os.Build;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FocusDisplay")
public class FocusDisplayPlugin extends Plugin {
    private Integer previousOrientation = null;
    private Integer previousCutoutMode = null;
    private boolean fullscreenActive = false;

    @PluginMethod
    public void setMode(PluginCall call) {
        boolean awake = Boolean.TRUE.equals(call.getBoolean("awake", false));
        boolean landscape = Boolean.TRUE.equals(call.getBoolean("landscape", false));
        boolean fullscreen = Boolean.TRUE.equals(call.getBoolean("fullscreen", false));
        getActivity().runOnUiThread(() -> {
            try {
                if (awake) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

                if (fullscreen != fullscreenActive) {
                    WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                        getActivity().getWindow(), getActivity().getWindow().getDecorView());
                    if (fullscreen) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            WindowManager.LayoutParams attributes = getActivity().getWindow().getAttributes();
                            previousCutoutMode = attributes.layoutInDisplayCutoutMode;
                            attributes.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                            getActivity().getWindow().setAttributes(attributes);
                        }
                        WindowCompat.setDecorFitsSystemWindows(getActivity().getWindow(), false);
                        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                        controller.hide(WindowInsetsCompat.Type.systemBars());
                    } else {
                        controller.show(WindowInsetsCompat.Type.systemBars());
                        WindowCompat.setDecorFitsSystemWindows(getActivity().getWindow(), true);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && previousCutoutMode != null) {
                            WindowManager.LayoutParams attributes = getActivity().getWindow().getAttributes();
                            attributes.layoutInDisplayCutoutMode = previousCutoutMode;
                            getActivity().getWindow().setAttributes(attributes);
                            previousCutoutMode = null;
                        }
                    }
                    fullscreenActive = fullscreen;
                }

                if (landscape && previousOrientation == null) {
                    previousOrientation = getActivity().getRequestedOrientation();
                    getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
                } else if (!landscape && previousOrientation != null) {
                    getActivity().setRequestedOrientation(previousOrientation);
                    previousOrientation = null;
                }
                JSObject result = new JSObject();
                result.put("awake", awake);
                result.put("landscape", landscape);
                result.put("fullscreen", fullscreen);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("屏幕设置失败：" + error.getMessage());
            }
        });
    }
}
