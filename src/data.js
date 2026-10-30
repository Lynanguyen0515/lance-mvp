// Mock data. Times are minutes after midnight; the demo clock starts at 9:00.
export const START_TIME = 9 * 60

export const USERS = [
  { id: 'maya', name: 'Maya Chen', role: 'Housekeeper', initials: 'MC', color: '#b48ab0' },
  { id: 'jordan', name: 'Jordan Blake', role: 'Front desk / Supervisor', initials: 'JB', color: '#7fae7f' },
]

export const OCCASIONS = {
  anniversary: { label: 'Anniversary', icon: '💍', items: ['Rose petals on bed', 'Handwritten card', 'Chocolate plate'] },
  engagement: { label: 'Engagement', icon: '💐', items: ['Champagne on ice', 'Handwritten card', 'Rose petals on bed'] },
  birthday: { label: 'Birthday', icon: '🎂', items: ['Handwritten card', 'Cupcake', 'Balloon'] },
  babymoon: { label: 'Babymoon', icon: '🍼', items: ['Handwritten card', 'Extra pillows', 'Sparkling juice'] },
  graduation: { label: 'Graduation', icon: '🎓', items: ['Handwritten card', 'Chocolate plate'] },
  other: { label: 'Other', icon: '✨', items: ['Handwritten card'] },
}

// type: checkout | stayover. arrival: next guest's ETA (minutes) or null.
export const INITIAL_ROOMS = [
  { id: '103', floor: 1, type: 'checkout', bed: 'King', arrival: 15 * 60, planned: 30, status: 'dirty', assignee: 'maya' },
  { id: '104', floor: 1, type: 'stayover', bed: 'Queen x2', arrival: null, planned: 20, status: 'dirty', assignee: 'maya' },
  { id: '105', floor: 1, type: 'checkout', bed: 'King', arrival: 13 * 60, planned: 30, status: 'dirty', assignee: 'maya',
    occasion: { kind: 'anniversary', guest: 'Mr. & Mrs. Ortiz', note: '10th anniversary, arriving from airport', items: OCCASIONS.anniversary.items, done: [], state: 'pending' } },
  { id: '106', floor: 1, type: 'checkout', bed: 'Suite', arrival: null, planned: 45, status: 'dirty', assignee: 'maya' },
  { id: '204', floor: 2, type: 'checkout', bed: 'King', arrival: 16 * 60, planned: 30, status: 'dirty', assignee: 'maya' },
  { id: '205', floor: 2, type: 'stayover', bed: 'King', arrival: null, planned: 20, status: 'dirty', assignee: 'maya' },
  { id: '207', floor: 2, type: 'checkout', bed: 'King', arrival: 14 * 60, planned: 30, status: 'dirty', assignee: 'priya' },
  { id: '306', floor: 3, type: 'checkout', bed: 'Suite', arrival: 17 * 60, planned: 45, status: 'dirty', assignee: 'rosa' },
]
