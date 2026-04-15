/**
 * Example: Trigger management
 * Create scheduled automations that fire skills on a cron schedule.
 */

import { AmigoClient, isNotFoundError } from '@amigo-ai/platform-sdk'

const client = new AmigoClient({
  apiKey: process.env['AMIGO_API_KEY']!,
  workspaceId: process.env['AMIGO_WORKSPACE_ID']!,
})

async function main() {
  // First, get the skill we want to automate
  const { items: skills } = await client.skills.list({ search: 'outreach' })
  const outreachSkill = skills[0]
  if (!outreachSkill) {
    console.error('No outreach skill found — create one first')
    return
  }

  // Create a trigger that fires the skill every weekday at 1 PM ET
  const trigger = await client.triggers.create({
    name: 'Daily Patient Outreach',
    description: 'Reaches out to patients who have upcoming appointments',
    action_id: outreachSkill.id,
    schedule: '0 13 * * 1-5',
    timezone: 'America/New_York',
    input_template: {
      lookback_hours: 24,
      channel: 'voice',
    },
  })
  console.log('Created trigger:', trigger.id)
  console.log('Next fire at:', trigger.next_fire_at)

  // Fire it immediately for testing
  const run = await client.triggers.fire(trigger.id, {
    input_overrides: { dry_run: true },
  })
  console.log('Test run started:', run.id, 'status:', run.status)

  // Pause the trigger temporarily
  const paused = await client.triggers.pause(trigger.id)
  console.log('Paused:', !paused.is_active)

  // Resume it
  const resumed = await client.triggers.resume(trigger.id)
  console.log('Resumed:', resumed.is_active)

  // List all triggers
  const { items: triggers } = await client.triggers.list({ is_active: true })
  console.log(`Workspace has ${triggers.length} active trigger(s)`)

  // Error handling example
  try {
    await client.triggers.get('non-existent-trigger-id')
  } catch (err) {
    if (isNotFoundError(err)) {
      console.log('Trigger not found (expected):', err.message)
    }
  }
}

main().catch(console.error)
