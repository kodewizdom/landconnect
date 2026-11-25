import "react-native-gesture-handler";
import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./src/navigation/navigationRef";
import { SocketProvider } from "./src/context/SocketContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { LoadingScreen } from "./src/screens/LoadingScreen";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Startup ErrorBoundary]", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>LandConnect Startup Notice</Text>
          <Text style={styles.errorSubtitle}>
            An unhandled runtime error occurred during application initialization:
          </Text>
          <ScrollView style={styles.errorScroll}>
            <Text style={styles.errorMessage}>
              {this.state.error?.toString()}
            </Text>
            {this.state.errorInfo?.componentStack && (
              <Text style={styles.errorStack}>
                {this.state.errorInfo.componentStack}
              </Text>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRestart}>
            <Text style={styles.retryText}>Retry Launch</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <SocketProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </SocketProvider>
        {showSplash ? (
          <View
            style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}
            pointerEvents="auto"
          >
            <LoadingScreen />
          </View>
        ) : null}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: "#0B2B26",
    padding: 24,
    paddingTop: 64,
    justifyContent: "center",
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#C5A059",
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: "#F8F7F4",
    marginBottom: 16,
    lineHeight: 20,
  },
  errorScroll: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorMessage: {
    fontSize: 13,
    color: "#FEE2E2",
    fontWeight: "600",
    marginBottom: 12,
  },
  errorStack: {
    fontSize: 11,
    color: "#A0A8A6",
    fontFamily: "monospace",
  },
  retryButton: {
    backgroundColor: "#C5A059",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  retryText: {
    color: "#0B2B26",
    fontWeight: "700",
    fontSize: 15,
  },
});
