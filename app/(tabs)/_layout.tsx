import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Personal',
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
        }}
      />
    </Tabs>
  );
}
