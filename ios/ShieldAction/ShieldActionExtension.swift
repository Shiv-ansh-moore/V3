import ManagedSettings

// This extension handles what happens when the user
// taps a button on your custom shield screen.
//
// iOS calls handle() with the action (.primaryButtonPressed
// or .secondaryButtonPressed) and you respond via the
// completionHandler with either:
//   .close  → dismisses the blocked app (goes to home screen)
//   .defer  → keeps the shield open (does nothing)

class ShieldActionExtension: ShieldActionDelegate {
    
    override func handle(
        action: ShieldAction,
        for application: ApplicationToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        switch action {
            
        case .primaryButtonPressed:
            // "Open V3" button tapped.
            // .close dismisses the blocked app → user lands
            // on home screen and can tap V3 to open it.
            // (Shield extensions are sandboxed — they can't
            // directly launch another app. This is the
            // standard pattern.)
            completionHandler(.close)
            
        case .secondaryButtonPressed:
            // "Close" button tapped.
            // Same thing — just close and go home.
            completionHandler(.close)
            
        @unknown default:
            completionHandler(.close)
        }
    }
}

