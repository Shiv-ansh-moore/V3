import ManagedSettings
import ManagedSettingsUI
import UIKit

class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  
  // ── COLOUR DEFINITIONS ──
  // These match your app's design tokens from Colours.ts
  // We define them here because this extension can't access
  // your React Native code — it's a separate iOS process.
  
  // #0A0A0A — your app's background colour
  private let bgColor = UIColor(
    red: 10/255, green: 10/255, blue: 10/255, alpha: 1
  )
  
  // #FF6B00 — Electric Orange, your accent colour
  private let brandColor = UIColor(
    red: 1, green: 107/255, blue: 0, alpha: 1
  )
  
  // #FFFFFF — primary text
  private let textColor = UIColor.white
  
  // #878787 — secondary/muted text
  private let subtitleColor = UIColor(
    red: 135/255, green: 135/255, blue: 135/255, alpha: 1
  )
  
  // ── SHIELDING AN APP ──
  // This is called every time iOS needs to display the shield
  // over a blocked app. It returns a ShieldConfiguration
  // which tells iOS how to render each slot.
  
  override func configuration(
    shielding application: Application
  ) -> ShieldConfiguration {
    return ShieldConfiguration(
      
      // The full-screen background behind everything
      backgroundColor: bgColor,
      
      // Icon at the top of the shield (nil = no icon for now)
      // You can add your app logo here later as a UIImage
      icon: nil,
      
      // Big text — the main message the user sees
      title: ShieldConfiguration.Label(
        text: "This app is locked",
        color: textColor
      ),
      
      // Smaller text below the title — your motivational nudge
      subtitle: ShieldConfiguration.Label(
        text: "Stay focused. You've got this.",
        color: subtitleColor
      ),
      
      // The main action button — this is what we want
      // the user to tap. Text is white on orange background.
      primaryButtonLabel: ShieldConfiguration.Label(
        text: "Open V3",
        color: textColor
      ),
      primaryButtonBackgroundColor: brandColor,
      
      // Secondary option — less prominent, no background.
      // Just dismisses the shield and goes back to home screen.
      secondaryButtonLabel: ShieldConfiguration.Label(
        text: "Close",
        color: subtitleColor
      )
    )
  }
  
  // ── SHIELDING AN APP (by category) ──
  // Same thing, but triggered when the app was blocked because
  // its CATEGORY was blocked (e.g. "Social Networking")
  // rather than the specific app. We reuse the same config.
  
  override func configuration(
    shielding application: Application,
    in category: ActivityCategory
  ) -> ShieldConfiguration {
    return configuration(shielding: application)
  }
}
