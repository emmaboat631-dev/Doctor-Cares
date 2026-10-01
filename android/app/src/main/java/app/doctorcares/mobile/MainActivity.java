package app.doctorcares.mobile;

import com.getcapacitor.BridgeActivity;

/**
 * Native mic recording via getUserMedia proved unreliable inside Capacitor's
 * Android WebView — the equivalent PWA install works, so voice messages are
 * handled through that path instead. Nothing custom is needed here anymore.
 */
public class MainActivity extends BridgeActivity {}
