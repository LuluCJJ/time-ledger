package app.personal.timeledger;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(LedgerExportPlugin.class);
        registerPlugin(FocusDisplayPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
