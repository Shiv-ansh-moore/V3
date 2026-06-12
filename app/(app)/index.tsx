import { Animated, Platform, StyleSheet, View } from "react-native";
import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import Social from "../../components/Social";
import Personal from "../../components/Personal";
import Dashboard from "../../components/Dashboard";
import TabBar from "../../components/TabBar";
import { Colours } from "../../constants/Colours";
import { useCallback, useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { requestAuthorization } from "../../modules/screen-time-locks";
import { useLocalSearchParams } from "expo-router";

let screenTimeAuthorizationPromise: Promise<void> | null = null;

function ensureScreenTimeAuthorization() {
  if (!screenTimeAuthorizationPromise) {
    screenTimeAuthorizationPromise = requestAuthorization()
      .then(() => undefined)
      .catch((err) => {
        screenTimeAuthorizationPromise = null;
        console.error("Screen Time error:", err);
      });
  }

  return screenTimeAuthorizationPromise;
}

export default function MyPager() {
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialPage = tab === "social" ? 1 : 0;
  const scrollPosition = useRef(new Animated.Value(initialPage)).current;
  const pagerRef = useRef<PagerView>(null);
  const activePageRef = useRef(initialPage);
  const [activePage, setActivePage] = useState(initialPage);

  const updateActivePage = useCallback((index: number) => {
    activePageRef.current = index;
    setActivePage(index);
  }, []);

  const selectPage = useCallback(
    (index: number) => {
      if (activePageRef.current === index) return;

      updateActivePage(index);
      pagerRef.current?.setPage(index);
    },
    [updateActivePage],
  );

  useEffect(() => {
    if (tab !== "social") return;

    requestAnimationFrame(() => {
      selectPage(1);
    });
  }, [selectPage, tab]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    void ensureScreenTimeAuthorization();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={{ top: "additive" }}>
        <TabBar
          scrollPosition={scrollPosition}
          onTabPress={selectPage}
        />
        <PagerView
          ref={pagerRef}
          style={styles.container}
          initialPage={initialPage}
          onPageSelected={(e) => updateActivePage(e.nativeEvent.position)}
          onPageScroll={(e) => {
            const { position, offset } = e.nativeEvent;
            scrollPosition.setValue(Math.min(position + offset, 1));
          }}
        >
          <View key="0" style={styles.page}>
            <Personal />
          </View>
          <View key="1" style={styles.page}>
            <Social active={activePage === 1} />
          </View>
          <View key="2" style={styles.page}>
            <Dashboard active={activePage === 2} />
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
  page: {
    flex: 1,
  },
});
