import { Animated, StyleSheet, View } from "react-native";
import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import Social from "../../components/Social";
import Personal from "../../components/Personal";
import TabBar from "../../components/TabBar";
import { Colours } from "../../constants/Colours";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { requestAuthorization } from "../../modules/screen-time-locks";

export default function MyPager() {
  const scrollPosition = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<PagerView>(null);
  useEffect(() => {
    requestAuthorization()
      .then((result) => console.log("Screen Time:", result))
      .catch((err) => console.error("Screen Time error:", err));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={{ top: "additive" }}>
        <TabBar
          scrollPosition={scrollPosition}
          onTabPress={(index) => pagerRef.current?.setPage(index)}
        />
        <PagerView
          ref={pagerRef}
          style={styles.container}
          initialPage={0}
          onPageScroll={(e) => {
            const { position, offset } = e.nativeEvent;
            scrollPosition.setValue(position + offset);
          }}
        >
          <View key="0">
            <Personal />
          </View>
          <View key="1">
            <Social />
          </View>
        </PagerView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.background,
  },
});
