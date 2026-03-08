# Document Picker Setup Instructions

The soil health upload feature uses `react-native-document-picker` to allow users to select images and PDF files from their device.

## Installation Steps

The library has been installed via npm, but you need to rebuild the Android app to link the native modules.

### For Android:

1. **Clean and rebuild the Android app:**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx react-native run-android
   ```

2. **Alternative: If the above doesn't work, try:**
   ```bash
   # Stop the Metro bundler (Ctrl+C)
   # Clear caches
   npx react-native start --reset-cache
   
   # In another terminal, rebuild
   cd android
   ./gradlew clean
   cd ..
   npx react-native run-android
   ```

### Permissions

The library should work without additional permissions for Android 6.0+, but if you encounter issues:

1. Make sure your app has storage permissions
2. On Android 11+, the app uses the system file picker which doesn't require explicit permissions

## Troubleshooting

### Error: "Failed to pick document"

This usually means:
1. The native module isn't linked properly - **Solution**: Rebuild the app
2. The app doesn't have file access - **Solution**: Grant permissions in Settings
3. The file picker crashed - **Solution**: Check logcat for details

### How to check logcat:
```bash
adb logcat | grep -i "document"
```

### If rebuild doesn't work:

Try these steps:
```bash
# 1. Remove node_modules and reinstall
rm -rf node_modules
npm install

# 2. Clean Android build
cd android
./gradlew clean
cd ..

# 3. Clear all caches
rm -rf android/app/build
rm -rf android/build
npx react-native start --reset-cache

# 4. Rebuild
npx react-native run-android
```

## Testing

After rebuilding:
1. Open the app
2. Go to Soil Health screen
3. Tap "Upload New Soil Health Card"
4. Choose "Upload Image"
5. Tap "Tap to select image"
6. The system file picker should open
7. Select an image or PDF file
8. The file details should appear in the app

## Alternative: Use react-native-image-picker

If document-picker continues to have issues, we can switch to `react-native-image-picker` which is more stable but only supports images (not PDFs):

```bash
npm install react-native-image-picker
```

Then update the component to use ImagePicker instead of DocumentPicker.
