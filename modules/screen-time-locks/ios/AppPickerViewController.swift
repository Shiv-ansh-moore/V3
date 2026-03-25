import SwiftUI
import FamilyControls

@available(iOS 16.0, *)

class AppPickerViewController: UIHostingController<AppPickerView>{
    var onSelectionComplete: ((FamilyActivitySelection) -> Void)?
    init(){
        let pickerView = AppPickerView()
        super.init(rootView: pickerView)
    }
    @MainActor required dynamic init?(coder aDecoder: NSCoder) {
    fatalError("init(coder:) not implemented")
  }
}

@available(iOS 16.0, *)
struct AppPickerView: View {
  @State private var selection = FamilyActivitySelection()

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Choose Apps")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") {
              NotificationCenter.default.post(
                name: .appSelectionComplete,
                object: selection
              )
            }
          }
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") {
              NotificationCenter.default.post(
                name: .appSelectionCancelled,
                object: nil
              )
            }
          }

        }
    }
  }
}

extension Notification.Name {
  static let appSelectionComplete = Notification.Name("appSelectionComplete")
  static let appSelectionCancelled = Notification.Name("appSelectionCancelled")
}