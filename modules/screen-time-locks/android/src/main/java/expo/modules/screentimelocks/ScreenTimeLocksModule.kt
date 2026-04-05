package expo.modules.screentimelocks

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ScreenTimeLocksModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ScreenTimeLocks")

    AsyncFunction("requestAuthorization") {
      return@AsyncFunction "not_supported"
    }

    AsyncFunction("showAppPicker") {
      return@AsyncFunction mapOf("selectedApps" to 0)
    }

    AsyncFunction("blockApps") { packageNames: List<String> ->
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("blocked" to 0)
      BlockedAppsStore.setBlockedApps(context, packageNames.toSet())
      return@AsyncFunction mapOf("blocked" to packageNames.size)
    }

    AsyncFunction("unblockApps") {
      val context = appContext.reactContext ?: return@AsyncFunction "error"
      BlockedAppsStore.setBlockedApps(context, emptySet())
      return@AsyncFunction "ok"
    }

    AsyncFunction("addBlockedApp") { packageName: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      BlockedAppsStore.addBlockedApp(context, packageName)
    }

    AsyncFunction("removeBlockedApp") { packageName: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      BlockedAppsStore.removeBlockedApp(context, packageName)
    }

    AsyncFunction("getBlockedApps") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<String>()
      return@AsyncFunction BlockedAppsStore.getBlockedApps(context).toList()
    }

    AsyncFunction("manageBlockedApps") {
      return@AsyncFunction mapOf("cancelled" to true)
    }

    AsyncFunction("unlockForDuration") { minutes: Int, reason: String ->
      return@AsyncFunction "not_supported"
    }

    AsyncFunction("relockNow") {
      return@AsyncFunction "not_supported"
    }

    Function("getActiveUnlock") {
      return@Function null
    }
  }
}
