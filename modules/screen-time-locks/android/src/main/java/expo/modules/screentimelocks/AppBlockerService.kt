package expo.modules.screentimelocks

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent

class AppBlockerService : AccessibilityService() {

    private var lastPackage = ""

    // Called every time a window changes on the phone
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Ignore null events or non-window events
        if (event == null) return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        // Get the package name of the app that just opened
        val packageName = event.packageName?.toString() ?: return

        // Skip if it's the same app (avoid spam), system UI, or ourselves
        if (packageName == lastPackage) return
        if (packageName == "com.android.systemui") return
        if (packageName == applicationContext.packageName) return

        lastPackage = packageName

        // For now, just log it
        Log.d("V3Blocker", "App opened: $packageName")
    }

    // Called when the service is first connected
    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d("V3Blocker", "Accessibility Service connected!")
    }

    // Required override, we don't use it
    override fun onInterrupt() {
        Log.d("V3Blocker", "Accessibility Service interrupted")
    }
}
