# Build a Custom Clinical Copilot

This guide walks through building a clinical documentation copilot using the Amigo Platform SDK. A scribe (like Superscribe) listens to a clinical encounter in real time, extracts SOAP notes, suggests ICD-10 codes, and lets the physician review and finalize everything before it syncs to the EHR.

## Concepts

**Scribe** is a real-time ambient documentation tool for clinical encounters. The system has three layers:

1. **Agent Engine** -- provides a `/copilot-stream` WebSocket that handles live audio transcription, clinical extraction, and real-time intelligence
2. **Platform API** -- exposes REST endpoints for encounter review actions (ICD-10 approval, SOAP editing, finalization) and scribe settings
3. **World Model** -- stores the encounter as an entity with projected clinical state (SOAP, ICD-10 suggestions, clinical alerts)

The SDK covers layers 2 and 3. Layer 1 (the WebSocket) is documented below but uses a direct WebSocket connection, not the SDK.

### Encounter lifecycle

```
recording --> in_progress --> review --> finalized
```

During recording, the copilot WebSocket streams transcript segments and tool results (SOAP updates, ICD-10 suggestions, clinical alerts). Once the encounter ends, the physician reviews and finalizes the documentation.

## Step 1: Configure scribe settings

Enable scribe for your workspace and configure authorized clinicians:

```typescript
import { AmigoClient } from '@amigo-ai/platform-sdk'
import type { components } from '@amigo-ai/platform-sdk'

const client = new AmigoClient({
  apiKey: process.env.AMIGO_API_KEY!,
  workspaceId: process.env.AMIGO_WORKSPACE_ID!,
})

// Check current scribe settings
const settings = await client.settings.scribe.get()
console.log('Scribe enabled:', settings.enabled)
console.log('SOAP style:', settings.soap_style)
console.log('Language:', settings.language)
console.log('STT keyterms:', settings.keyterms)
console.log('Authorized clinicians:', settings.authorized_clinicians.length)

// Enable scribe, clinical STT controls, and clinician access.
await client.settings.scribe.update({
  enabled: true,
  soap_style: 'detailed',
  language: 'es',
  keyterms: ['metformin', 'Ozempic', 'Dr. Ramirez'],
  specialty: 'Primary care',
  custom_instructions: 'Prefer concise assessment bullets and preserve quoted patient goals.',
  voice_auth_enabled: true,
  authorized_clinicians: [
    {
      email: 'dr.smith@clinic.com',
      name: 'Dr. Sarah Smith',
      role: 'clinician',
    },
  ],
})
```

## Step 2: Find or create a scribe service

A scribe service ties together the agent configuration and the copilot capabilities:

```typescript
// List services and find the scribe one
const { items: services } = await client.services.list()
const scribeService = services.find((s) => s.channel_type === 'scribe')

if (!scribeService) {
  console.log('No scribe service found. Create one in the developer console.')
}

console.log('Scribe service ID:', scribeService?.id)
```

## Step 3: Connect to the copilot WebSocket

The copilot WebSocket is hosted on the agent-engine service. It is not part of the SDK -- you connect directly via a standard WebSocket client.

### Authentication

The WebSocket requires a JWT token. Obtain one through your authentication flow (Google OAuth for clinicians, or an API-issued session token).

### Connection

```typescript
const wsUrl = new URL('wss://api.platform.amigo.ai/voice-agent/copilot-stream')
wsUrl.searchParams.set('workspace_id', process.env.AMIGO_WORKSPACE_ID!)
wsUrl.searchParams.set('service_id', scribeService.id)
wsUrl.searchParams.set('token', clinicianJwt)

const ws = new WebSocket(wsUrl.toString())

ws.onopen = () => {
  console.log('Copilot connected')
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  handleCopilotMessage(message)
}

ws.onerror = (error) => {
  console.error('WebSocket error:', error)
}

ws.onclose = (event) => {
  console.log('Copilot disconnected:', event.code, event.reason)
}
```

### Sending audio

Stream PCM16 audio frames to the WebSocket as binary messages:

```typescript
// From a MediaRecorder or audio capture device
function sendAudioChunk(pcm16Buffer: ArrayBuffer) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(pcm16Buffer)
  }
}
```

### Receiving messages

The copilot sends JSON messages with a `type` field:

```typescript
type CopilotMessage =
  | { type: 'transcript_segment'; data: TranscriptSegment }
  | { type: 'tool_result'; tool: string; data: unknown }

interface TranscriptSegment {
  speaker: string
  text: string
  timestamp: number
  is_final: boolean
}

function handleCopilotMessage(message: CopilotMessage) {
  switch (message.type) {
    case 'transcript_segment':
      // Live transcription -- update the transcript display
      console.log(`[${message.data.speaker}]: ${message.data.text}`)
      break

    case 'tool_result':
      // Clinical intelligence results
      switch (message.tool) {
        case 'soap_update':
          // SOAP note section was updated
          console.log('SOAP updated:', message.data)
          break
        case 'icd10_suggestions':
          // New ICD-10 code suggestions
          console.log('ICD-10 suggestions:', message.data)
          break
        case 'clinical_alert':
          // Drug interaction, allergy, or other clinical alert
          console.log('Clinical alert:', message.data)
          break
        case 'encounter_entity':
          // Full encounter entity state update
          console.log('Encounter state:', message.data)
          break
      }
      break
  }
}
```

## Step 4: Poll encounter state via the SDK

While the WebSocket provides real-time updates, you can also poll the encounter entity through the world model for the latest projected state:

```typescript
// The encounter entity ID comes from the WebSocket session or from the world model
const encounterId = 'encounter-entity-id'

// Get the encounter entity with projected clinical state
const encounter = await client.world.getEntity(encounterId)

console.log('Encounter:', encounter.display_name)
console.log('Entity type:', encounter.entity_type) // "encounter"
console.log('State:', JSON.stringify(encounter.state, null, 2))
// state includes:
//   soap: { subjective, objective, assessment, plan }
//   icd10_codes: [{ code, description, confidence, status }]
//   clinical_alerts: [{ type, message, severity }]
//   transcript_segments: [{ speaker, text, timestamp }]

// Get the encounter's event timeline
const timeline = await client.world.getTimeline(encounterId, { limit: 50 })
for (const event of timeline.events) {
  console.log(`${event.domain}.${event.event_type}: ${event.created_at}`)
}
```

## Step 5: Physician review actions

After the encounter ends, the physician reviews the AI-generated documentation and makes corrections.

### Approve ICD-10 codes

```typescript
// Approve a suggested ICD-10 code (writes at HIGH confidence 0.9)
await client.POST('/v1/{workspace_id}/scribe/encounters/{encounter_id}/icd10/approve', {
  params: { path: { encounter_id: encounterId } },
  body: { code: 'J06.9' }, // Acute upper respiratory infection
})

// Approve multiple codes
const codesToApprove = ['J06.9', 'R05.9', 'Z87.09']
for (const code of codesToApprove) {
  await client.POST('/v1/{workspace_id}/scribe/encounters/{encounter_id}/icd10/approve', {
    params: { path: { encounter_id: encounterId } },
    body: { code },
  })
}
```

### Reject ICD-10 codes

```typescript
// Reject an incorrect suggestion with an optional reason
await client.POST('/v1/{workspace_id}/scribe/encounters/{encounter_id}/icd10/reject', {
  params: { path: { encounter_id: encounterId } },
  body: {
    code: 'Z87.09',
    reason: 'Patient has no relevant allergy history',
  },
})
```

### Edit SOAP notes

```typescript
// Edit a specific SOAP section (writes at HIGH confidence 0.9, supersedes agent observations)
await client.POST('/v1/{workspace_id}/scribe/encounters/{encounter_id}/soap/edit', {
  params: { path: { encounter_id: encounterId } },
  body: {
    section: 'assessment',
    content:
      'Patient presents with acute upper respiratory infection. ' +
      'Symptoms consistent with viral etiology. No signs of bacterial superinfection.',
  },
})

// Edit the plan
await client.POST('/v1/{workspace_id}/scribe/encounters/{encounter_id}/soap/edit', {
  params: { path: { encounter_id: encounterId } },
  body: {
    section: 'plan',
    content:
      '1. Supportive care: rest, fluids, OTC antipyretics\n' +
      '2. Follow up in 7 days if symptoms worsen\n' +
      '3. Return precautions discussed',
  },
})
```

Valid SOAP sections: `subjective`, `objective`, `assessment`, `plan`.

### Finalize the encounter

Once review is complete, finalize the encounter. This locks the documentation for EHR sync:

```typescript
await client.POST('/v1/{workspace_id}/scribe/encounters/{encounter_id}/finalize', {
  params: { path: { encounter_id: encounterId } },
})

console.log('Encounter finalized and ready for EHR sync')
```

## Step 6: Voiceprint enrollment (speaker verification)

Enroll a clinician's voiceprint for automatic speaker identification during encounters.

### Enroll

```typescript
// Enroll a voiceprint from an audio sample (FormData with PCM16 wav)
const enrollForm = new FormData()
enrollForm.append('entity_id', clinicianEntityId)
enrollForm.append('audio', audioFile, 'enrollment.wav')

const enrollment = await client.POST('/v1/{workspace_id}/voiceprints/enroll', {
  body: enrollForm as never,
})

console.log('Enrolled:', enrollment.data.enrolled)
console.log('Entity ID:', enrollment.data.entity_id)
console.log('Model ID:', enrollment.data.model_id)
console.log('Embedding dimensions:', enrollment.data.dimensions) // 192
```

### Verify

```typescript
// Verify a speaker against their enrolled voiceprint
const verifyForm = new FormData()
verifyForm.append('entity_id', clinicianEntityId)
verifyForm.append('audio', audioSample, 'verify.wav')

const verification = await client.POST('/v1/{workspace_id}/voiceprints/verify', {
  body: verifyForm as never,
})

console.log('Verified:', verification.data.verified)
console.log('Similarity score:', verification.data.similarity)
```

### Check enrollment status

```typescript
const status = await client.GET('/v1/{workspace_id}/voiceprints/{entity_id}', {
  params: { path: { entity_id: clinicianEntityId } },
})

console.log('Enrolled:', status.data.enrolled)
console.log('Enrolled at:', status.data.enrolled_at)
```

## WebSocket protocol reference

| Direction        | Format         | Description                          |
| ---------------- | -------------- | ------------------------------------ |
| Client -> Server | Binary (PCM16) | Raw audio frames                     |
| Server -> Client | JSON           | Transcript segments and tool results |

### Server message types

| `type`               | `tool` (for tool_result) | Description                                                |
| -------------------- | ------------------------ | ---------------------------------------------------------- |
| `transcript_segment` | --                       | Live transcription with speaker, text, timestamp, is_final |
| `tool_result`        | `soap_update`            | SOAP note section updated                                  |
| `tool_result`        | `icd10_suggestions`      | New ICD-10 code suggestions                                |
| `tool_result`        | `clinical_alert`         | Drug interaction, allergy, or care gap alert               |
| `tool_result`        | `encounter_entity`       | Full encounter entity state snapshot                       |

### Connection URL

```
wss://{api-host}/voice-agent/copilot-stream?workspace_id={ws}&service_id={svc}&token={jwt}
```

Parameters:

- `workspace_id` -- your workspace UUID
- `service_id` -- the scribe service ID
- `token` -- a valid JWT for the authenticated clinician

## SDK endpoints reference

| Method | Path                                            | Description                    |
| ------ | ----------------------------------------------- | ------------------------------ |
| GET    | `/v1/{ws}/settings/scribe`                      | Get scribe settings            |
| PUT    | `/v1/{ws}/settings/scribe`                      | Update scribe settings         |
| POST   | `/v1/{ws}/scribe/encounters/{id}/icd10/approve` | Approve an ICD-10 code         |
| POST   | `/v1/{ws}/scribe/encounters/{id}/icd10/reject`  | Reject an ICD-10 code          |
| POST   | `/v1/{ws}/scribe/encounters/{id}/soap/edit`     | Edit a SOAP section            |
| POST   | `/v1/{ws}/scribe/encounters/{id}/finalize`      | Finalize the encounter         |
| POST   | `/v1/{ws}/voiceprints/enroll`                   | Enroll a voiceprint (FormData) |
| POST   | `/v1/{ws}/voiceprints/verify`                   | Verify a speaker               |
| GET    | `/v1/{ws}/voiceprints/{entity_id}`              | Check enrollment status        |

The `client.settings.scribe.get()` and `client.settings.scribe.update(...)` resource methods are available for scribe settings. All other scribe and voiceprint operations use the `client.POST(...)` / `client.GET(...)` helpers.

## Next steps

- [API Reference](https://docs.amigo.ai/api-reference) -- full endpoint documentation
- [api.md](../../api.md) -- generated SDK surface reference
- [examples/scribe/](../../examples/scribe/) -- runnable code examples
