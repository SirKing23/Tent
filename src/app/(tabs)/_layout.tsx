import Ionicons from "@react-native-vector-icons/ionicons";

import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="properties"
        options={{
          title: "Properties",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "storefront" : "storefront-outline"}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="monthlyBillings"
        options={{
          title: "Monthly Billings",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cashbooks"
        options={{
          title: "Cashbooks",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="options"
        options={{
          title: "Options",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "menu" : "menu-outline"} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
