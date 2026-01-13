# MA3 Bridge Test Scenarios

## Scenario 1: MA3 NOT Running (Current State)
When you run the test:
- Bridge says: ✅ Script sent successfully
- Reality: UDP packets sent to port 8000, but nothing is listening
- MA3 Command Line: N/A (app not running)

## Scenario 2: MA3 Running but OSC Disabled
When you run the test:
- Bridge says: ✅ Script sent successfully  
- Reality: MA3 is running but ignoring OSC messages
- MA3 Command Line: No output (OSC not enabled)

## Scenario 3: MA3 Running with OSC Enabled ✨
When you run the test:
- Bridge says: ✅ Script sent successfully
- Reality: MA3 receives and executes the script
- MA3 Command Line shows:
  ```
  === MA3 Bridge Test ===
  Time: Mon Jan 13 09:45:00 2025
  Bridge is working!
  Found 0 fixture groups
  Test complete!
  ```

## How to Test Properly

1. **Start MA3 onPC**
   - Launch grandMA3 onPC
   - Load a show file (or create new)

2. **Enable OSC**
   - Menu → System → MA Network Control
   - Check "OSC" box
   - Port: 8000
   - Apply

3. **Open Command Line**
   - System → Command Line Feedback
   - This window shows script output

4. **Run Test Again**
   ```bash
   .\test-manual.ps1
   ```

5. **Watch MA3 Command Line**
   - You should see the Printf/Echo output
   - Any errors will appear here too

## Quick Test Without MA3
To see if the bridge itself is working:
- ✅ Bridge starts without errors
- ✅ Health endpoint responds
- ✅ Test endpoint accepts scripts
- ✅ Status shows "sent successfully"

All of these are working correctly! The bridge is ready - it just needs MA3 to be running to see the actual results.