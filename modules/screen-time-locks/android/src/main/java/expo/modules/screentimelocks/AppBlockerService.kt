package expo.modules.screentimelocks

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent

class AppBlockerService : AccessibilityService() {

    private var lastPackage = ""

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val packageName = event.packageName?.toString() ?: return

        if (packageName == lastPackage) return
        if (packageName == "com.android.systemui") return
        if (packageName == applicationContext.packageName) return

        lastPackage = packageName

        Log.d("V3Blocker", "App opened: $packageName")

        val blockedApps = BlockedAppsStore.getBlockedApps(applicationContext)
        if (packageName in blockedApps) {
            Log.d("V3Blocker", "BLOCKED: $packageName")
            performGlobalAction(GLOBAL_ACTION_HOME)
            lastPackage = ""
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d("V3Blocker", "Accessibility Service connected!")
    }

    override fun onInterrupt() {
        Log.d("V3Blocker", "Accessibility Service interrupted")
    }
}
