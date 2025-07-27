// netlify/functions/log-click.js
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const supabase   = createClient(supabaseUrl, supabaseKey)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { tool, sessionId, userAgent } = JSON.parse(event.body)

    // 1. See if we already have a log for this user+tool
    const { count, error: countError } = await supabase
      .from('tool_logs')
      .select('id', { head: true, count: 'exact' })
      .eq('session_id', sessionId)
      .eq('tool', tool)

    if (countError) throw countError

    // 2. If already logged (count ≥ 1), do nothing
    if (count >= 1) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, skipped: true })
      }
    }

    // 3. Otherwise insert a new record
    const { error: insertError } = await supabase
      .from('tool_logs')
      .insert([{
        tool,
        session_id: sessionId,
        user_agent: userAgent || event.headers['user-agent']
      }])

    if (insertError) throw insertError

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, skipped: false })
    }
  } catch (err) {
    console.error('Logging error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Logging failed' })
    }
  }
}
