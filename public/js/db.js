// ============================================================================
// PawPrint — IndexedDB Local Database (offline-first data layer)
// Mirrors the production entities described in the PawPrint handoff doc.
// ============================================================================

const DB_NAME = 'pawprint';
const DB_VERSION = 10;

let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      const tx = event.target.transaction;

      // v9: likes became keyed by generic targetId (postId rows migrated here)
      if (event.oldVersion < 9 && db.objectStoreNames.contains('likes')) {
        const likeTx = tx.objectStore('likes');
        if (!likeTx.indexNames.contains('targetId')) {
          likeTx.createIndex('targetId', 'targetId', { unique: false });
        }
        likeTx.openCursor().onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) return;
          const row = cursor.value;
          if (row.targetId === undefined && row.postId !== undefined) row.targetId = row.postId;
          cursor.update(row);
          cursor.continue();
        };
      }

      // Users
      if (!db.objectStoreNames.contains('users')) {
        const store = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        store.createIndex('email', 'email', { unique: true });
        store.createIndex('phone', 'phone', { unique: true });
        store.createIndex('role', 'role', { unique: false });
      }

      // Pets
      if (!db.objectStoreNames.contains('pets')) {
        const store = db.createObjectStore('pets', { keyPath: 'id', autoIncrement: true });
        store.createIndex('ownerId', 'ownerId', { unique: false });
        store.createIndex('species', 'species', { unique: false });
      }

      // Businesses
      if (!db.objectStoreNames.contains('businesses')) {
        const store = db.createObjectStore('businesses', { keyPath: 'id', autoIncrement: true });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('ownerId', 'ownerId', { unique: false });
      }

      // Competitions
      if (!db.objectStoreNames.contains('competitions')) {
        const store = db.createObjectStore('competitions', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }

      // Competition entries
      if (!db.objectStoreNames.contains('entries')) {
        const store = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
        store.createIndex('competitionId', 'competitionId', { unique: false });
        store.createIndex('petId', 'petId', { unique: false });
        store.createIndex('ownerId', 'ownerId', { unique: false });
      }

      // Votes
      if (!db.objectStoreNames.contains('votes')) {
        const store = db.createObjectStore('votes', { keyPath: 'id', autoIncrement: true });
        store.createIndex('competitionId', 'competitionId', { unique: false });
        store.createIndex('entryId', 'entryId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Reviews
      if (!db.objectStoreNames.contains('reviews')) {
        const store = db.createObjectStore('reviews', { keyPath: 'id', autoIncrement: true });
        store.createIndex('businessId', 'businessId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Posts (community feed)
      if (!db.objectStoreNames.contains('posts')) {
        const store = db.createObjectStore('posts', { keyPath: 'id', autoIncrement: true });
        store.createIndex('authorId', 'authorId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Notifications
      if (!db.objectStoreNames.contains('notifications')) {
        const store = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('read', 'read', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // PawPoints ledger
      if (!db.objectStoreNames.contains('pointsLedger')) {
        const store = db.createObjectStore('pointsLedger', { keyPath: 'id', autoIncrement: true });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Rewards catalogue
      if (!db.objectStoreNames.contains('rewards')) {
        db.createObjectStore('rewards', { keyPath: 'id', autoIncrement: true });
      }

      // Bookings (enquiries)
      if (!db.objectStoreNames.contains('bookings')) {
        const store = db.createObjectStore('bookings', { keyPath: 'id', autoIncrement: true });
        store.createIndex('businessId', 'businessId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Events
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
      }

      // Challenges
      if (!db.objectStoreNames.contains('challenges')) {
        db.createObjectStore('challenges', { keyPath: 'id', autoIncrement: true });
      }

      // Reward redemptions (doc §5.23: redeem → voucher → business confirms)
      if (!db.objectStoreNames.contains('redemptions')) {
        const store = db.createObjectStore('redemptions', { keyPath: 'id', autoIncrement: true });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('businessId', 'businessId', { unique: false });
      }

      // Favourites (saved businesses)
      if (!db.objectStoreNames.contains('favourites')) {
        const store = db.createObjectStore('favourites', { keyPath: 'id', autoIncrement: true });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Event RSVPs
      if (!db.objectStoreNames.contains('eventRsvps')) {
        const store = db.createObjectStore('eventRsvps', { keyPath: 'id', autoIncrement: true });
        store.createIndex('eventId', 'eventId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Post comments (doc §5.9)
      if (!db.objectStoreNames.contains('comments')) {
        const store = db.createObjectStore('comments', { keyPath: 'id', autoIncrement: true });
        store.createIndex('postId', 'postId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Moderation reports (doc §5.9 / §15.3)
      if (!db.objectStoreNames.contains('reports')) {
        const store = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('targetType', 'targetType', { unique: false });
      }

      // Local communities (doc §5.10)
      if (!db.objectStoreNames.contains('communities')) {
        const store = db.createObjectStore('communities', { keyPath: 'id', autoIncrement: true });
        store.createIndex('ownerId', 'ownerId', { unique: false });
      }

      // Community memberships (public + private groups, join gate)
      if (!db.objectStoreNames.contains('communityMembers')) {
        const store = db.createObjectStore('communityMembers', { keyPath: 'id', autoIncrement: true });
        store.createIndex('communityId', 'communityId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Following: users and businesses (doc §5.9)
      if (!db.objectStoreNames.contains('follows')) {
        const store = db.createObjectStore('follows', { keyPath: 'id', autoIncrement: true });
        store.createIndex('followerId', 'followerId', { unique: false });
        store.createIndex('followeeId', 'followeeId', { unique: false });
      }

      // Challenge participation & progress (doc §5.15)
      if (!db.objectStoreNames.contains('challengeParticipations')) {
        const store = db.createObjectStore('challengeParticipations', { keyPath: 'id', autoIncrement: true });
        store.createIndex('challengeId', 'challengeId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Business Showdown votes (doc §5.14)
      if (!db.objectStoreNames.contains('showdownVotes')) {
        const store = db.createObjectStore('showdownVotes', { keyPath: 'id', autoIncrement: true });
        store.createIndex('showdownId', 'showdownId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Admin audit log (doc §10.7 / §7.1)
      if (!db.objectStoreNames.contains('auditLogs')) {
        const store = db.createObjectStore('auditLogs', { keyPath: 'id', autoIncrement: true });
        store.createIndex('actorId', 'actorId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Direct messages (doc §5.9: private messaging)
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
        store.createIndex('fromUserId', 'fromUserId', { unique: false });
        store.createIndex('toUserId', 'toUserId', { unique: false });
        store.createIndex('read', 'read', { unique: false });
      }

      // Adoption & rescue animal listings (doc §5.29)
      if (!db.objectStoreNames.contains('adoptions')) {
        const store = db.createObjectStore('adoptions', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('species', 'species', { unique: false });
      }

      // Adoption applications (facilitated by the platform, decided by orgs)
      if (!db.objectStoreNames.contains('adoptionApplications')) {
        const store = db.createObjectStore('adoptionApplications', { keyPath: 'id', autoIncrement: true });
        store.createIndex('animalId', 'animalId', { unique: false });
        store.createIndex('applicantId', 'applicantId', { unique: false });
      }

      // Business Showdowns (doc §5.14)
      if (!db.objectStoreNames.contains('showdowns')) {
        db.createObjectStore('showdowns', { keyPath: 'id', autoIncrement: true });
      }

      // Post likes (doc §5.9: react to posts)
      if (!db.objectStoreNames.contains('likes')) {
        const store = db.createObjectStore('likes', { keyPath: 'id', autoIncrement: true });
        store.createIndex('postId', 'postId', { unique: false });
        store.createIndex('targetId', 'targetId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Business applications (doc §3.3: businesses apply to join / claim)
      if (!db.objectStoreNames.contains('businessApplications')) {
        const store = db.createObjectStore('businessApplications', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('applicantId', 'applicantId', { unique: false });
      }

      // Payment transactions (audit trail for M-Pesa / cards / bank transfers)
      if (!db.objectStoreNames.contains('payments')) {
        const store = db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('businessId', 'businessId', { unique: false });
        store.createIndex('purpose', 'purpose', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getDB() {
  if (!dbInstance) dbInstance = await openDB();
  return dbInstance;
}

// Generic helpers
function storeName(table) { return table; }

async function dbPut(table, data) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(table, 'readwrite');
    const store = tx.objectStore(table);
    const req = store.put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(table, id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(table, 'readonly');
    const store = tx.objectStore(table);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(table) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(table, 'readonly');
    const store = tx.objectStore(table);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(table, id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(table, 'readwrite');
    const store = tx.objectStore(table);
    const req = store.delete(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Index-based queries
async function dbGetByIndex(table, indexName, value) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(table, 'readonly');
    const store = tx.objectStore(table);
    const index = store.index(indexName);
    const req = index.getAll(IDBKeyRange.only(value));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Shared enrichment seed: adoption animals + showdown + pet photos.
// Called on fresh seeds AND on backfill for upgraded databases.
async function seedAdoptions() {
  const adoptions = await dbGetAll('adoptions');
  if (adoptions.length) return;
  const now = new Date().toISOString();
  await dbPut('adoptions', {
    name: 'Bella',
    species: 'Dog',
    breed: 'Labrador mix',
    age: 2,
    sex: 'Female',
    description: 'Bella is a foster-mum favourite — gentle with kids, loves the sofa and will wait by the door for walkies. Vaccinated and spayed.',
    org: 'Nairobi Rescue & Rehome',
    location: 'The Hub, Karen',
    status: 'available',
    image: '/images/pawprint-arena-dog.jpg',
    createdAt: now,
  });
  await dbPut('adoptions', {
    name: 'Kibo',
    species: 'Cat',
    breed: 'Siamese mix',
    age: 1,
    sex: 'Male',
    description: 'Curious, chatty and working his way onto every unoccupied lap in Karen. Ready for a patient, playful home.',
    org: 'Nairobi Rescue & Rehome',
    location: 'The Hub, Karen',
    status: 'available',
    image: '/images/pawprint-cat-profile.jpg',
    createdAt: now,
  });
  await dbPut('adoptions', {
    name: 'Chacha',
    species: 'Dog',
    breed: 'Borzoi mix',
    age: 4,
    sex: 'Male',
    description: 'A gentle giant rescued from the streets of Industrial Area. Needs a patient home with experienced large-dog owners.',
    org: 'Nairobi Rescue & Rehome',
    location: 'Uhuru Park rescue drive',
    status: 'available',
    image: '/images/pawprint-dog-park.jpg',
    createdAt: now,
  });
}

async function seedShowdowns() {
  const businesses = await dbGetAll('businesses');
  // A second grooming business so the showdown has a challenger
  let karura = businesses.find((b) => b.name === 'Karura Pampered Pets');
  if (!karura) {
    await dbPut('businesses', {
      name: 'Karura Pampered Pets',
      category: 'Grooming',
      description: 'Boutique grooming studio by Karura Forest — gentle handling for nervous dogs.',
      address: 'Kiambu Road, Nairobi',
      lat: -1.2430,
      lng: 36.8300,
      phone: '+254 700 555 666',
      email: 'hello@karurapampered.co.ke',
      website: null,
      hours: 'Mon–Sat 8am–5pm',
      services: ['Full groom', 'Bath & brush', 'Puppy first groom'],
      products: [],
      priceInfo: 'KES 1,000–3,500',
      verification: 'verified',
      rating: 4.4,
      reviewsCount: 15,
      socials: { instagram: 'karurapampered' },
      booking: true,
      awards: [],
      ranking: { position: 3, movement: 'steady', score: 82 },
      logo: null,
      cover: null,
      createdAt: new Date().toISOString(),
    });
    const all = await dbGetAll('businesses');
    karura = all[all.length - 1];
  }

  const showdowns = await dbGetAll('showdowns');
  if (showdowns.length) return;
  const groomGlow = businesses.find((b) => b.name === 'Groom & Glow Pet Salon');
  await dbPut('showdowns', {
    title: 'Westlands Showdown: Best Grooming Salon',
    scope: 'Westlands',
    story: 'Two grooming studios go head-to-head for the season — Nairobi decides who takes the crown.',
    businessIds: [groomGlow ? groomGlow.id : 2, karura.id],
    prize: 'Grooming Showdown Champion badge + featured placement',
    sponsor: 'PetMart Kenya',
    startDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: 'active',
    createdAt: new Date().toISOString(),
  });
}

async function seedPetPhotos() {
  const pets = await dbGetAll('pets');
  const demo = {
    Simba: [
      { type: 'image', url: '/images/pawprint-arena-dog.jpg', name: 'Simba at Karura Forest' },
      { type: 'image', url: '/images/pawprint-dog-park.jpg', name: 'Karura pack walk' },
    ],
    Luna: [
      { type: 'image', url: '/images/pawprint-cat-profile.jpg', name: 'Luna basking in the sun' },
    ],
  };
  for (const pet of pets) {
    if (!Array.isArray(pet.photos) || pet.photos.length === 0) {
      pet.photos = demo[pet.name] || [];
      await dbPut('pets', pet);
    }
  }
}

// Seed the database with demo data if empty
async function seedIfEmpty() {
  const users = await dbGetAll('users');

  // Ensure the platform admin always exists (even in already-seeded databases)
  if (users.length > 0) {
    // Backfill referral codes for accounts seeded before they were introduced
    for (const u of users) {
      if (!u.referralCode && u.role !== 'admin') {
        const base = (u.name || 'PAW').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'PAW';
        let code = null;
        for (let attempt = 0; !code && attempt < 20; attempt += 1) {
          const candidate = `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
          const taken = users.some((x) => x.referralCode === candidate);
          if (!taken) code = candidate;
        }
        u.referralCode = code || `${base}-${Date.now().toString(36).toUpperCase()}`;
        await dbPut('users', u);
      }
    }

    // Backfill: competition entries without a status are grandfathered in
    const entries = await dbGetAll('entries');
    for (const entry of entries) {
      if (!entry.status) {
        entry.status = 'approved';
        await dbPut('entries', entry);
      }
    }

    if (!users.some((u) => u.role === 'admin')) {
      await dbPut('users', {
        name: 'PawPrint Admin',
        email: 'admin@pawprint.co.ke',
        phone: '+254 700 000 003',
        password: 'password123',
        role: 'admin',
        avatar: null,
        location: 'Nairobi, Kenya',
        referralCode: 'ADMIN-PAW3',
        createdAt: new Date().toISOString(),
      });
    }

    // Backfill challenge data introduced in v5 for databases seeded before it
    const existingChallenges = await dbGetAll('challenges');
    const walking = existingChallenges.find((c) => c.name === '30-Day Walking Challenge');
    if (walking && !walking.completionTarget) {
      walking.completionTarget = 30;
      walking.unit = 'walks';
      await dbPut('challenges', walking);
    }
    if (!existingChallenges.some((c) => c.name === 'Teach Your Dog Three New Tricks')) {
      await dbPut('challenges', {
        name: 'Teach Your Dog Three New Tricks',
        description: 'Film or photograph your dog performing three new tricks and share them with the pack.',
        eligibility: 'Dog owners',
        startDate: new Date(Date.now() - 3 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 25 * 86400000).toISOString(),
        completionCriteria: 'Three tricks submitted as evidence',
        completionTarget: 3,
        unit: 'tricks',
        evidenceRequired: true,
        rewards: '100 PawPoints + Trick Champion badge',
        sponsor: 'Groom & Glow Pet Salon',
        createdAt: new Date().toISOString(),
      });
    }
    if (!existingChallenges.some((c) => c.name === 'Explore Five Pet-Friendly Places')) {
      await dbPut('challenges', {
        name: 'Explore Five Pet-Friendly Places',
        description: 'Visit and log five pet-friendly cafés, parks, shops or hotels around Nairobi.',
        eligibility: 'All pet owners',
        startDate: new Date(Date.now() - 6 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 40 * 86400000).toISOString(),
        completionCriteria: 'Five places logged',
        completionTarget: 5,
        unit: 'places',
        evidenceRequired: false,
        rewards: '100 PawPoints',
        sponsor: 'PetMart Kenya',
        createdAt: new Date().toISOString(),
      });
    }
    const amina = users.find((u) => u.email === 'amina@example.com');
    if (amina && walking) {
      const parts = await dbGetAll('challengeParticipations');
      if (!parts.some((p) => p.challengeId === walking.id && p.userId === amina.id)) {
        await dbPut('challengeParticipations', {
          challengeId: walking.id,
          userId: amina.id,
          progress: 12,
          status: 'joined',
          verified: true,
          evidence: null,
          joinedAt: new Date(Date.now() - 9 * 86400000).toISOString(),
        });
      }
    }

    await seedAdoptions();
    await seedShowdowns();
    await seedPetPhotos();

    return;
  }

  const now = new Date().toISOString();

  // Demo pet owner
  await dbPut('users', {
    id: 1,
    name: 'Amina Wanjiku',
    email: 'amina@example.com',
    phone: '+254 700 000 001',
    password: 'password123',
    role: 'pet_owner',
    avatar: null,
    location: 'Westlands, Nairobi',
    referralCode: 'AMINA-PAW1',
    createdAt: now,
  });

  // Demo business owner
  await dbPut('users', {
    id: 2,
    name: 'James Mwangi',
    email: 'james@pawclinic.co.ke',
    phone: '+254 700 000 002',
    password: 'password123',
    role: 'business_owner',
    avatar: null,
    location: 'Karen, Nairobi',
    referralCode: 'JAMES-PAW2',
    createdAt: now,
  });

  // Platform administrator
  await dbPut('users', {
    id: 3,
    name: 'PawPrint Admin',
    email: 'admin@pawprint.co.ke',
    phone: '+254 700 000 003',
    password: 'password123',
    role: 'admin',
    avatar: null,
    location: 'Nairobi, Kenya',
    referralCode: 'ADMIN-PAW3',
    createdAt: now,
  });

  // Pets
  await dbPut('pets', {
    id: 1,
    ownerId: 1,
    name: 'Simba',
    species: 'Dog',
    breed: 'Borzoi',
    age: 3,
    gender: 'Male',
    personality: 'Playful and friendly',
    interests: ['Running', 'Fetch'],
    bio: 'Loves long walks in Karura Forest.',
    photos: [
      { type: 'image', url: '/images/pawprint-arena-dog.jpg', name: 'Simba at Karura Forest' },
      { type: 'image', url: '/images/pawprint-dog-park.jpg', name: 'Karura pack walk' },
    ],
    achievements: ['Best Rescue Story 2025'],
    competitionHistory: [],
    visibility: 'public',
    createdAt: now,
  });
  await dbPut('pets', {
    id: 2,
    ownerId: 1,
    name: 'Luna',
    species: 'Cat',
    breed: 'Siamese',
    age: 2,
    gender: 'Female',
    personality: 'Curious and calm',
    interests: ['Napping', 'Bird watching'],
    bio: 'Rescued from Nairobi SPCA.',
    photos: [
      { type: 'image', url: '/images/pawprint-cat-profile.jpg', name: 'Luna basking in the sun' },
    ],
    achievements: [],
    competitionHistory: [],
    visibility: 'public',
    createdAt: now,
  });

  // Businesses
  await dbPut('businesses', {
    id: 1,
    ownerId: 2,
    name: 'PawCare Veterinary Clinic',
    category: 'Veterinary services',
    description: 'Compassionate veterinary care for your furry friends.',
    address: 'Mall Road, Westlands, Nairobi',
    lat: -1.2633,
    lng: 36.8120,
    phone: '+254 700 111 222',
    email: 'info@pawcare.co.ke',
    website: 'https://pawcare.co.ke',
    hours: 'Mon–Sat 8am–6pm',
    services: ['Consultation', 'Vaccination', 'Surgery', 'Dental care'],
    products: [],
    priceInfo: 'KES 2,500–8,000',
    verification: 'verified',
    rating: 4.8,
    reviewsCount: 42,
    socials: { instagram: 'pawcareke', facebook: 'PawCareKenya' },
    booking: true,
    awards: ['Best Veterinary Clinic Nairobi 2025'],
    ranking: { position: 1, movement: 'up', score: 94 },
    logo: null,
    cover: null,
    createdAt: now,
  });
  await dbPut('businesses', {
    id: 2,
    ownerId: 2,
    name: 'Groom & Glow Pet Salon',
    category: 'Grooming',
    description: 'Professional grooming and pampering for dogs and cats.',
    address: 'Sarit Centre, Westlands, Nairobi',
    lat: -1.2530,
    lng: 36.8150,
    phone: '+254 700 333 444',
    email: 'hello@groomglow.co.ke',
    website: null,
    hours: 'Tue–Sun 9am–7pm',
    services: ['Full groom', 'Bath & brush', 'Nail trim'],
    products: ['Shampoo', 'Brushes'],
    priceInfo: 'KES 1,500–4,000',
    verification: 'verified',
    rating: 4.6,
    reviewsCount: 28,
    socials: { instagram: 'groomglow.ke' },
    booking: true,
    awards: [],
    ranking: { position: 2, movement: 'steady', score: 87 },
    logo: null,
    cover: null,
    createdAt: now,
  });

  // Competitions
  await dbPut('competitions', {
    id: 1,
    name: "Nairobi's Cutest Pet",
    category: 'Cuteness',
    description: 'Show us your pet\'s cutest side!',
    entryStart: new Date(Date.now() - 7 * 86400000).toISOString(),
    entryEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
    votingStart: new Date(Date.now() - 2 * 86400000).toISOString(),
    votingEnd: new Date(Date.now() + 14 * 86400000).toISOString(),
    eligibility: 'All pets in Nairobi',
    votingRules: 'One vote per user per day',
    prize: 'KES 10,000 pet store voucher + feature',
    sponsor: 'PetMart Kenya',
    status: 'active',
    createdAt: now,
  });
  await dbPut('competitions', {
    id: 2,
    name: 'Dog of the Week',
    category: 'Dogs',
    description: 'Weekly celebration of Nairobi\'s best dogs.',
    entryStart: new Date(Date.now() - 3 * 86400000).toISOString(),
    entryEnd: new Date(Date.now() + 4 * 86400000).toISOString(),
    votingStart: new Date(Date.now() - 1 * 86400000).toISOString(),
    votingEnd: new Date(Date.now() + 10 * 86400000).toISOString(),
    eligibility: 'Dogs only',
    votingRules: 'One vote per user',
    entryType: 'points',
    entryCost: 20,
    prize: 'Featured profile badge',
    sponsor: null,
    status: 'active',
    createdAt: now,
  });

  // Entries
  await dbPut('entries', {
    id: 1,
    competitionId: 1,
    petId: 1,
    ownerId: 1,
    description: 'Simba at Karura Forest sunrise.',
    photos: [],
    votes: 124,
    status: 'approved',
    createdAt: now,
  });
  await dbPut('entries', {
    id: 2,
    competitionId: 1,
    petId: 2,
    ownerId: 1,
    description: 'Luna basking in the afternoon sun.',
    photos: [],
    votes: 98,
    status: 'approved',
    createdAt: now,
  });

  // Votes
  await dbPut('votes', {
    id: 1,
    competitionId: 1,
    entryId: 1,
    userId: 1,
    createdAt: now,
  });

  // Reviews
  await dbPut('reviews', {
    id: 1,
    businessId: 1,
    userId: 1,
    rating: 5,
    comment: 'Excellent care for Simba. Highly recommend!',
    photos: [],
    verified: true,
    createdAt: now,
  });
  await dbPut('reviews', {
    id: 2,
    businessId: 1,
    userId: 2,
    rating: 5,
    comment: 'Professional and friendly staff.',
    photos: [],
    verified: true,
    createdAt: now,
  });

  // Posts
  await dbPut('posts', {
    id: 1,
    authorId: 1,
    authorName: 'Amina Wanjiku',
    text: 'Simba just completed his first agility class! So proud of my boy. 🐾',
    type: 'text',
    photos: [],
    reactions: 24,
    comments: 1,
    communityId: 1,
    pinned: true,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  });
  await dbPut('posts', {
    id: 2,
    authorId: 2,
    authorName: 'PawCare Veterinary Clinic',
    text: 'Reminder: Pet vaccination drive this Saturday at our Westlands clinic. Book your slot!',
    type: 'announcement',
    photos: [],
    reactions: 12,
    comments: 0,
    communityId: 1,
    pinned: false,
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
  });
  await dbPut('posts', {
    id: 3,
    authorId: 3,
    authorName: 'PawPrint',
    text: 'Welcome to Westlands Pet Parents! 🐾 Introduce your pet below, share the best local walks, and keep it kind — read our rules before posting. Karura Forest pack walk happens every first Saturday.',
    type: 'announcement',
    photos: [],
    reactions: 41,
    comments: 3,
    communityId: 1,
    pinned: true,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  });
  await dbPut('posts', {
    id: 4,
    authorId: 3,
    authorName: 'PawPrint',
    text: 'Adoption Saturday is here! Meet Nairobi Rescue & Rehome\'s lovely dogs at The Hub, Karen — 11 AM. Bring a leash, leave with a friend. 💛',
    type: 'announcement',
    photos: [],
    reactions: 63,
    comments: 6,
    communityId: 3,
    pinned: true,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  });
  await dbPut('posts', {
    id: 5,
    authorId: 2,
    authorName: 'James Mwangi',
    text: 'Karen Dog Lovers — Sunday social walk at the Karen Blixen garden gates, 8 AM. All sizes welcome, water station at the halfway point.',
    type: 'text',
    photos: [],
    reactions: 18,
    comments: 2,
    communityId: 2,
    pinned: false,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  });

  // Local communities (doc §5.10)
  await dbPut('communities', {
    id: 1,
    name: 'Westlands Pet Parents',
    description: 'Your neighbourhood pack for Westlands and surrounds — share walks, vet tips, playdates and the best pet-friendly spots on Waiyaki Way.',
    location: 'Westlands, Nairobi',
    image: '/images/pawprint-cat-profile.jpg',
    rules: [
      'Be kind — every pet and every owner is welcome here.',
      'No buying, selling or rehoming in the general feed.',
      'Post pet-friendly place finds and walk reports.',
      'Keep vaccination and rescue advice accurate and gentle.',
    ],
    ownerId: 1,
    membersBase: 860,
    isPublic: true,
    createdAt: now,
  });
  await dbPut('communities', {
    id: 2,
    name: 'Karen Dog Lovers',
    description: 'For the Karen and Langata dog community — Sunday social walks, training meetups and café recommendations for you and your best friend.',
    location: 'Karen, Nairobi',
    image: '/images/pawprint-dog-park.jpg',
    rules: [
      'Dogs must be leashed unless in designated off-lead areas.',
      'Clean up after your dog — always.',
      'Training advice stays positive-reinforcement only.',
      'Event posts must include date, time and meeting point.',
    ],
    ownerId: 2,
    membersBase: 1240,
    isPublic: true,
    createdAt: now,
  });
  await dbPut('communities', {
    id: 3,
    name: 'Nairobi Rescue & Rehome',
    description: 'Amplifying Nairobi\'s rescue organisations — adoption days, fostering calls, donation drives and success stories that warm the heart.',
    location: 'Nairobi, Kenya',
    image: '/images/pawprint-vet-clinic.jpg',
    rules: [
      'Only verified rescue organisations may post adoption listings.',
      'Adoption applications are handled by the organisation, not PawPrint.',
      'Fundraising posts must name the beneficiary and the cause.',
      'Celebrate every adoption win — this is a judgment-free zone.',
    ],
    ownerId: 3,
    membersBase: 2430,
    isPublic: true,
    createdAt: now,
  });

  // Memberships
  await dbPut('communityMembers', {
    id: 1,
    communityId: 1,
    userId: 1,
    joinedAt: now,
  });
  await dbPut('communityMembers', {
    id: 2,
    communityId: 1,
    userId: 2,
    joinedAt: now,
  });
  await dbPut('communityMembers', {
    id: 3,
    communityId: 2,
    userId: 2,
    joinedAt: now,
  });

  // Comments
  await dbPut('comments', {
    id: 1,
    postId: 1,
    userId: 2,
    userName: 'James Mwangi',
    text: 'Congrats Simba! 🎉 Agility suits borzois.',
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  });

  // Notifications
  await dbPut('notifications', {
    id: 1,
    userId: 1,
    title: 'New vote on your entry',
    body: 'Someone voted for Simba in "Nairobi\'s Cutest Pet"',
    type: 'competition',
    read: false,
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  });
  await dbPut('notifications', {
    id: 2,
    userId: 1,
    title: 'PawPoints earned',
    body: 'You earned 50 PawPoints for completing your pet profile.',
    type: 'reward',
    read: false,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  });

  // PawPoints ledger
  await dbPut('pointsLedger', {
    id: 1,
    userId: 1,
    type: 'earn',
    amount: 50,
    source: 'Complete pet profile',
    referenceId: 'pet_1',
    createdAt: now,
    status: 'completed',
  });
  await dbPut('pointsLedger', {
    id: 2,
    userId: 1,
    type: 'earn',
    amount: 30,
    source: 'Verify pet information',
    referenceId: 'pet_1',
    createdAt: now,
    status: 'completed',
  });

  // Rewards catalogue
  await dbPut('rewards', {
    id: 1,
    title: '10% off at PawCare Veterinary Clinic',
    cost: 100,
    type: 'discount',
    provider: 'PawCare Veterinary Clinic',
    description: 'Redeem for 10% off your next consultation.',
    available: true,
  });
  await dbPut('rewards', {
    id: 2,
    title: 'Free pet grooming session',
    cost: 250,
    type: 'service',
    provider: 'Groom & Glow Pet Salon',
    description: 'One complimentary full grooming session.',
    available: true,
  });
  await dbPut('rewards', {
    id: 3,
    title: 'Free nail trim',
    cost: 60,
    type: 'service',
    provider: 'Groom & Glow Pet Salon',
    description: 'Complimentary nail trim — quick in-and-out visit.',
    available: true,
  });
  await dbPut('rewards', {
    id: 4,
    title: 'Free vaccination booster',
    cost: 400,
    type: 'service',
    provider: 'PawCare Veterinary Clinic',
    description: 'Annual booster shot on the house.',
    available: true,
  });
  await dbPut('rewards', {
    id: 5,
    title: 'PetMart shopping voucher',
    cost: 150,
    type: 'voucher',
    provider: 'PetMart Kenya',
    description: 'KES 500 off any food or toy purchase.',
    available: true,
  });

  // Bookings
  await dbPut('bookings', {
    id: 1,
    businessId: 1,
    userId: 1,
    service: 'Consultation',
    petId: 1,
    status: 'confirmed',
    requestedAt: now,
    confirmedAt: now,
  });

  // Challenges
  await dbPut('challenges', {
    id: 1,
    name: '30-Day Walking Challenge',
    description: 'Walk your pet every day for 30 days.',
    eligibility: 'All pet owners',
    startDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 20 * 86400000).toISOString(),
    completionCriteria: '30 walks logged',
    completionTarget: 30,
    unit: 'walks',
    evidenceRequired: false,
    rewards: '100 PawPoints',
    sponsor: null,
    createdAt: now,
  });
  await dbPut('challenges', {
    id: 2,
    name: 'Teach Your Dog Three New Tricks',
    description: 'Film or photograph your dog performing three new tricks and share them with the pack.',
    eligibility: 'Dog owners',
    startDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 25 * 86400000).toISOString(),
    completionCriteria: 'Three tricks submitted as evidence',
    completionTarget: 3,
    unit: 'tricks',
    evidenceRequired: true,
    rewards: '100 PawPoints + Trick Champion badge',
    sponsor: 'Groom & Glow Pet Salon',
    createdAt: now,
  });
  await dbPut('challenges', {
    id: 3,
    name: 'Explore Five Pet-Friendly Places',
    description: 'Visit and log five pet-friendly cafés, parks, shops or hotels around Nairobi.',
    eligibility: 'All pet owners',
    startDate: new Date(Date.now() - 6 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 40 * 86400000).toISOString(),
    completionCriteria: 'Five places logged',
    completionTarget: 5,
    unit: 'places',
    evidenceRequired: false,
    rewards: '100 PawPoints',
    sponsor: 'PetMart Kenya',
    createdAt: now,
  });

  // Challenge participations
  await dbPut('challengeParticipations', {
    id: 1,
    challengeId: 1,
    userId: 1,
    progress: 12,
    status: 'joined',
    verified: true,
    evidence: null,
    joinedAt: new Date(Date.now() - 9 * 86400000).toISOString(),
  });

  // Events
  await dbPut('events', {
    id: 1,
    title: 'Nairobi Pet Meetup',
    description: 'Monthly meetup for pet owners at Uhuru Park.',
    location: 'Uhuru Park, Nairobi',
    date: new Date(Date.now() + 5 * 86400000).toISOString(),
    organiser: 'PawPrint Community',
    capacity: 50,
    registrations: 12,
    createdAt: now,
  });
  await dbPut('events', {
    id: 2,
    title: 'Karura Pack Walk',
    description: 'Group dog walk through Karura Forest, coffee after.',
    location: 'Karura Forest Gate B, Nairobi',
    date: new Date(Date.now() + 9 * 86400000).toISOString(),
    organiser: 'Nairobi Dog Walkers',
    capacity: 30,
    registrations: 8,
    createdAt: now,
  });

  // Enrichment for fresh databases
  await seedAdoptions();
  await seedShowdowns();
}

export { dbPut, dbGet, dbGetAll, dbDelete, dbGetByIndex, getDB, seedIfEmpty, DB_NAME };
