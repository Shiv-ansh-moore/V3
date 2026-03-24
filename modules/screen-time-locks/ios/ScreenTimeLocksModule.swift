import ExpoModulesCore
import FamilyControls

public class ScreenTimeLocksModule: Module{
  public func definition() -> ModuleDefinition{
    Name("ScreenTimeLocks")

    AsyncFunction("requestAuthorization"){
      if #available(iOS 16.0, *){
        try await AuthorizationCenter.shared.requestAuthorization(for:.individual)
        return "authorized"
      } else {
        throw NSError(
          domain:"ScreenTimeLocks",
          code: 1,
          userInfo:[NSLocalizedDescriptionKey: "Requires iOS 16+"]
        )
      }
    }
  }
}