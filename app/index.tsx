import { Animated, StyleSheet, View } from "react-native";
import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import Social from "../components/Social";
import Personal from "../components/Personal";
import TabBar from "../components/TabBar";
import { Colours } from "../constants/Colours";
import { useRef, useState } from "react";

export default function MyPager() {
  const scrollPosition = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<PagerView>(null);
  const [isPagerScrollEnabled, setIsPagerScrollEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <TabBar
        scrollPosition={scrollPosition}
        onTabPress={(index) => pagerRef.current?.setPage(index)}
      />
      <PagerView
        ref={pagerRef}
        style={styles.container}
        initialPage={0}
        scrollEnabled={isPagerScrollEnabled}
        onPageScroll={(e) => {
          const { position, offset } = e.nativeEvent;
          scrollPosition.setValue(position + offset);
        }}
      >
        <View key="0">
          <Personal />
        </View>
        <View key="1">
          <Social setIsPagerScrollEnabled={setIsPagerScrollEnabled} />
        </View>
      </PagerView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.background,
  },
});
