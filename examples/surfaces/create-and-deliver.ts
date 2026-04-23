import { createClient } from '../shared.js'

const client = createClient()

// Find a patient entity to attach the form to
const patients = await client.world.listEntities({
  q: 'Jane Doe',
  entity_type: ['patient'],
  limit: 1,
})

const patientId = patients.entities[0]?.id
if (!patientId) {
  console.error('No patient found. Create one first.')
  process.exit(1)
}

console.log(`Creating intake form for patient ${patientId}`)

// Create a patient intake surface
const surface = await client.POST('/v1/{workspace_id}/surfaces', {
  body: {
    entity_id: patientId,
    title: 'New Patient Intake',
    description: 'Please complete this form before your appointment.',
    channel: 'sms',
    expires_in_hours: 72,
    fields: [
      {
        key: 'full_name',
        label: 'Full Name',
        field_type: 'text',
        required: true,
        placeholder: 'First and last name',
      },
      {
        key: 'date_of_birth',
        label: 'Date of Birth',
        field_type: 'date',
        required: true,
      },
      {
        key: 'phone',
        label: 'Phone Number',
        field_type: 'phone',
        required: true,
      },
      {
        key: 'reason_for_visit',
        label: 'Reason for Visit',
        field_type: 'select',
        required: true,
        options: ['Annual Physical', 'Follow-up', 'New Concern', 'Urgent'],
      },
      {
        key: 'symptoms',
        label: 'Describe your symptoms',
        field_type: 'textarea',
        required: false,
        condition: {
          field: 'reason_for_visit',
          operator: 'in',
          value: ['New Concern', 'Urgent'],
        },
      },
      {
        key: 'current_medications',
        label: 'Current Medications',
        field_type: 'textarea',
        required: false,
      },
      {
        key: 'allergies',
        label: 'Known Allergies',
        field_type: 'multiselect',
        required: false,
        options: ['Penicillin', 'Sulfa', 'Latex', 'Iodine', 'None'],
      },
      {
        key: 'consent',
        label: 'I consent to treatment',
        field_type: 'checkbox',
        required: true,
        consent_text:
          'I acknowledge that I have reviewed the privacy policy and consent to receive care.',
      },
    ],
    branding: {
      primary_color: '#2563EB',
      background_color: '#F8FAFC',
    },
    completion_title: 'Thank you!',
    completion_message: 'Your form has been submitted successfully.',
  },
})

console.log('Surface created:')
console.log(`  ID:      ${surface.data.id}`)
console.log(`  Status:  ${surface.data.status}`)
console.log(`  URL:     ${surface.data.url}`)
console.log(`  Expires: ${surface.data.expires_at}`)
console.log(`  Fields:  ${surface.data.fields_count}`)

// Deliver via SMS
const delivery = await client.POST(
  '/v1/{workspace_id}/surfaces/{surface_id}/deliver',
  {
    params: { path: { surface_id: surface.data.id } },
    body: { channel_address: '+15551234567' },
  },
)

console.log('\nDelivery:')
console.log(`  Status:   ${delivery.data.status}`)
console.log(`  Provider: ${delivery.data.delivery_provider}`)
console.log(`  URL:      ${delivery.data.url}`)
