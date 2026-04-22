import { StyleSheet, Text, View } from "react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";

export default function SignUp() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>sign-up stub</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.background,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: Fonts.medium,
    color: Colours.text,
  },
});
