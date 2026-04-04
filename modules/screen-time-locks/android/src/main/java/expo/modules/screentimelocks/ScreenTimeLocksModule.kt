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

    AsyncFunction("blockApps") {
      return@AsyncFunction mapOf("blocked" to 0)
    }

    AsyncFunction("unblockApps") {
      return@AsyncFunction "not_supported"
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

