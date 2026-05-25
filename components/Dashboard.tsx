import { StyleSheet, Text, View } from "react-native";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";

export default function Dashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Dashboard placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colours.background,
    paddingHorizontal: 24,
  },
  placeholder: {
    color: Colours.text,
    fontFamily: Fonts.semiBold,
    fontSize: 22,
    textAlign: "center",
  },
});
