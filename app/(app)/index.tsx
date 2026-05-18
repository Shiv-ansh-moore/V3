import { Animated, Platform, StyleSheet, View } from "react-native";
import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import Social from "../../components/Social";
import Personal from "../../components/Personal";
import TabBar from "../../components/TabBar";
import { Colours } from "../../constants/Colours";
import { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { requestAuthorization } from "../../modules/screen-time-locks";
import { useLocalSearchParams } from "expo-router";

export default function MyPager() {
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialPage = tab === "social" ? 1 : 0;
  const scrollPosition = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<PagerView>(null);
  const [activePage, setActivePage] = useState(initialPage);

  useEffect(() => {
    if (tab !== "social") return;

    setActivePage(1);
    requestAnimationFrame(() => {
      pagerRef.current?.setPage(1);
    });
  }, [tab]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    requestAuthorization()
      .then((result) => console.log("Screen Time:", result))
      .catch((err) => console.error("Screen Time error:", err));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={{ top: "additive" }}>
        <TabBar
          scrollPosition={scrollPosition}
          onTabPress={(index) => {
            setActivePage(index);
            pagerRef.current?.setPage(index);
          }}
        />
        <PagerView
          ref={pagerRef}
          style={styles.container}
          initialPage={initialPage}
          onPageSelected={(e) => setActivePage(e.nativeEvent.position)}
          onPageScroll={(e) => {
            const { position, offset } = e.nativeEvent;
            scrollPosition.setValue(position + offset);
          }}
        >
          <View key="0">
            <Personal />
          </View>
          <View key="1">
            <Social active={activePage === 1} />
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
