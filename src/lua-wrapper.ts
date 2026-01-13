/**
 * Lua wrapper template for capturing script execution results
 * Ported from Python implementation: ma3-copilot-chainlit/gma3/runner.py
 */

/**
 * Lua wrapper template that:
 * 1. Overrides Printf and Echo to capture outputs
 * 2. Wraps user code in pcall for error handling
 * 3. Writes results to a JSON file
 */
export const LUA_WRAPPER_TEMPLATE = `
-- GMA3 Bridge Test Wrapper
-- Auto-generated: {{TIMESTAMP}}
-- Test ID: {{TEST_ID}}
-- Original file: {{ORIGINAL_FILE}}

local results = {
    success = true,
    errors = {},
    outputs = {},
    start_time = os.time(),
    test_id = "{{TEST_ID}}",
    original_file = "{{ORIGINAL_FILE}}"
}

local captured_outputs = {}
local captured_echos = {}
local original_Printf = Printf
local original_Echo = Echo

-- Override Printf to capture output
Printf = function(...)
    local args = {...}
    local output = ""
    for i, v in ipairs(args) do
        output = output .. tostring(v)
        if i < #args then output = output .. "\\t" end
    end
    table.insert(captured_outputs, output)
    original_Printf(...)
end

-- Also capture Echo calls (often used for errors)
Echo = function(msg)
    msg = tostring(msg)
    table.insert(captured_echos, msg)
    -- If it looks like an error, also add to errors
    if msg:match("^[Ee]rror") or msg:match("^ERROR") then
        table.insert(results.errors, msg)
    end
    original_Echo(msg)
end

-- Execute user code with error handling
local success, err = pcall(function()
{{USER_CODE}}
end)

-- Restore original functions
Printf = original_Printf
Echo = original_Echo

-- Check if user code returned a function (common mistake)
if success and type(err) == "function" then
    table.insert(results.errors, "Script returned a function instead of executing it. Did you forget to call it with ()?")
    results.success = false
    Printf("ERROR: Script returned a function instead of executing it")
elseif not success then
    table.insert(results.errors, tostring(err))
    Printf("ERROR: " .. tostring(err))
end

results.success = success

-- Combine Printf outputs and Echo messages
results.outputs = captured_outputs
for _, echo_msg in ipairs(captured_echos) do
    table.insert(results.outputs, "[Echo] " .. echo_msg)
end

-- If script failed but no errors were captured, add diagnostic info
if not results.success and #results.errors == 0 then
    table.insert(results.errors, "Script failed but no specific error was captured. Common causes:")
    table.insert(results.errors, "• Calling undefined functions")
    table.insert(results.errors, "• Returning a function instead of calling it")
    table.insert(results.errors, "• Syntax errors in dynamic code")
end

results.end_time = os.time()

-- Write results to JSON file
local result_file = "{{RESULT_PATH}}"
local file = io.open(result_file, "w")
if file then
    local json_str = "{\\n"
    json_str = json_str .. string.format('  "success": %s,\\n', tostring(success))
    json_str = json_str .. string.format('  "test_id": "%s",\\n', results.test_id)
    json_str = json_str .. string.format('  "original_file": "%s",\\n', results.original_file:gsub("\\\\", "\\\\\\\\"):gsub('"', '\\\\"'))
    
    json_str = json_str .. '  "errors": ['
    for i, e in ipairs(results.errors) do
        local escaped = tostring(e):gsub("\\\\", "\\\\\\\\"):gsub('"', '\\\\"'):gsub("\\n", "\\\\n"):gsub("\\r", "")
        json_str = json_str .. string.format('"%s"', escaped)
        if i < #results.errors then json_str = json_str .. ', ' end
    end
    json_str = json_str .. '],\\n'
    
    json_str = json_str .. '  "outputs": ['
    for i, o in ipairs(results.outputs) do
        local escaped = tostring(o):gsub("\\\\", "\\\\\\\\"):gsub('"', '\\\\"'):gsub("\\n", "\\\\n"):gsub("\\r", "")
        json_str = json_str .. string.format('"%s"', escaped)
        if i < #results.outputs then json_str = json_str .. ', ' end
    end
    json_str = json_str .. '],\\n'
    
    json_str = json_str .. string.format('  "start_time": %s,\\n', results.start_time)
    json_str = json_str .. string.format('  "end_time": %s\\n', results.end_time)
    json_str = json_str .. "}"
    
    file:write(json_str)
    file:close()
    Printf("Results written to: " .. result_file)
else
    Printf("ERROR: Could not write results to " .. result_file)
end
`;

/**
 * Generate a wrapped Lua script with result capture
 * @param userCode - The user's Lua code to wrap
 * @param testId - Unique test identifier
 * @param resultPath - Path where results should be written
 * @param originalFile - Original file name (optional)
 * @returns Wrapped Lua script
 */
export function wrapLuaScript(
  userCode: string,
  testId: string,
  resultPath: string,
  originalFile: string = 'inline'
): string {
  // Indent user code for proper nesting inside pcall
  const indentedCode = userCode
    .split('\n')
    .map(line => '    ' + line)
    .join('\n');

  // Escape backslashes in paths for Lua
  const escapedResultPath = resultPath.replace(/\\/g, '\\\\');
  const escapedOriginalFile = originalFile.replace(/\\/g, '\\\\');

  return LUA_WRAPPER_TEMPLATE
    .replace(/\{\{TIMESTAMP\}\}/g, new Date().toISOString())
    .replace(/\{\{TEST_ID\}\}/g, testId)
    .replace(/\{\{ORIGINAL_FILE\}\}/g, escapedOriginalFile)
    .replace(/\{\{USER_CODE\}\}/g, indentedCode)
    .replace(/\{\{RESULT_PATH\}\}/g, escapedResultPath);
}
