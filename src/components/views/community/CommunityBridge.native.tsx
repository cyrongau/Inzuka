import React from 'react';
import { StyleSheet, SafeAreaView, ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';

// NOTE: Change this to your deployed URL when you are ready to build for production
// For local development on physical device using Expo Go, replace this with your local IP
// Example: http://192.168.1.5:5173 
const PRODUCTION_URL = 'https://ais-pre-pro7lktzrbmgzxpqihmxew-375249207451.europe-west2.run.app';

export default function CommunityBridge() {
  return (
    <SafeAreaView style={styles.container}>
      <WebView 
        source={{ uri: PRODUCTION_URL }} 
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        )}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712', // Black/dark theme color to prevent white flash
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
