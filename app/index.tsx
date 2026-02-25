import { StyleSheet, View } from "react-native";
import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import Social from "../components/Social";
import Personal from "../components/Personal";
import TabBar from "../components/TabBar";

export default function MyPager() {
  return (
    <SafeAreaView style={styles.container}>
      <TabBar />
      <PagerView style={styles.container} initialPage={0}>
        <View key="0">
          <Personal />
        </View>
        <View key="1">
          <Social />
        </View>
      </PagerView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
