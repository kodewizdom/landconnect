import { PrismaClient, Role, AuthProvider, ListingStatus, CallPermission } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting LandConnect UAE database seed...");

  const passwordHash = await bcrypt.hash("Password@123", 10);

  // 1. Keep Demo Accounts Intact (Rename Demo Seller display name -> Demo Owner)
  const buyer = await prisma.user.upsert({
    where: { email: "buyer@landconnect.com" },
    update: {
      password_hash: passwordHash,
      role: Role.buyer,
      full_name: "Demo Buyer",
      member_code: "LC-BYR101",
      allow_calls_from: CallPermission.everyone,
      show_online: true,
    },
    create: {
      full_name: "Demo Buyer",
      email: "buyer@landconnect.com",
      member_code: "LC-BYR101",
      password_hash: passwordHash,
      role: Role.buyer,
      auth_provider: AuthProvider.local,
      allow_calls_from: CallPermission.everyone,
      show_online: true,
      avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: "seller@landconnect.com" },
    update: {
      password_hash: passwordHash,
      role: Role.seller,
      full_name: "Demo Owner",
      member_code: "LC-SLR101",
      allow_calls_from: CallPermission.everyone,
      show_online: true,
    },
    create: {
      full_name: "Demo Owner",
      email: "seller@landconnect.com",
      member_code: "LC-SLR101",
      password_hash: passwordHash,
      role: Role.seller,
      auth_provider: AuthProvider.local,
      allow_calls_from: CallPermission.everyone,
      show_online: true,
      avatar_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80",
    },
  });

  const broker = await prisma.user.upsert({
    where: { email: "broker@landconnect.com" },
    update: {
      password_hash: passwordHash,
      role: Role.broker,
      full_name: "Demo Broker",
      member_code: "LC-BRK101",
      allow_calls_from: CallPermission.everyone,
      show_online: true,
    },
    create: {
      full_name: "Demo Broker",
      email: "broker@landconnect.com",
      member_code: "LC-BRK101",
      password_hash: passwordHash,
      role: Role.broker,
      auth_provider: AuthProvider.local,
      allow_calls_from: CallPermission.everyone,
      show_online: true,
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    },
  });

  console.log(`Demo accounts verified: ${buyer.email}, ${seller.email} (${seller.full_name}), ${broker.email} (${broker.full_name})`);

  // 2. Safely Clear Old Test Listings Only (Preserve Users, Rooms, Messages, Call Logs)
  const detachedRooms = await prisma.room.updateMany({
    where: { listing_id: { not: null } },
    data: { listing_id: null },
  });
  const deletedImages = await prisma.listingImage.deleteMany({});
  const deletedListings = await prisma.listing.deleteMany({});
  console.log(
    `Cleared old listings: detached ${detachedRooms.count} room links, deleted ${deletedImages.count} listing images and ${deletedListings.count} listings.`
  );

  // 3. Seed 12 Realistic UAE Land Listings (8 Demo Broker + 4 Demo Owner)
  const uaeListings = [
    // 8 Listings Owned by Demo Broker
    {
      owner_id: broker.id,
      title: "Palm Jebel Ali Waterfront Plot",
      description:
        "Signature private beachfront development plot along Frond B of Palm Jebel Ali with direct Arabian Gulf frontage, yacht mooring allocation, underground utility provisions, and unrestricted custom mansion design guidelines.",
      price: 38500000.0,
      area_size: 22500.0,
      area_unit: "sqft",
      address_text: "Frond B, Palm Jebel Ali, Dubai, UAE",
      latitude: 25.0085,
      longitude: 54.9912,
      status: ListingStatus.available,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: broker.id,
      title: "Dubai Hills Estate Mansion Plot",
      description:
        "Elevated double-fairway residential parcel in Dubai Hills View overlooking the championship golf course and Downtown skyline. Approved for G+2 basement construction with clean Dubai Land Department title deed.",
      price: 29000000.0,
      area_size: 18400.0,
      area_unit: "sqft",
      address_text: "Hills View, Dubai Hills Estate, Dubai, UAE",
      latitude: 25.1125,
      longitude: 55.2448,
      status: ListingStatus.available,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: broker.id,
      title: "Business Bay Canal Commercial Parcel",
      description:
        "High-density commercial land parcel fronting the Dubai Water Canal promenade in Business Bay. Zoned for G+24 Grade-A boutique office or branded hospitality tower with full RTA road ingress and egress approvals.",
      price: 64000000.0,
      area_size: 35000.0,
      area_unit: "sqft",
      address_text: "Marasi Drive, Business Bay, Dubai, UAE",
      latitude: 25.1846,
      longitude: 55.2725,
      status: ListingStatus.negotiation,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: broker.id,
      title: "Al Marjan Island Beachfront Development Land",
      description:
        "Prime peninsula coastal development acreage on Al Marjan Island in Ras Al Khaimah with 190-meter private sandy shoreline. Ideal for boutique resort residences, beach club, or luxury hospitality compound.",
      price: 52000000.0,
      area_size: 2.4,
      area_unit: "acre",
      address_text: "Al Marjan Island Boulevard, Ras Al Khaimah, UAE",
      latitude: 25.6772,
      longitude: 55.7445,
      status: ListingStatus.available,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: broker.id,
      title: "Tilal Al Ghaf Lagoon Corner Plot",
      description:
        "Gated corner villa plot steps from the crystal swimmable lagoon and Elysian Mansions boardwalk in Tilal Al Ghaf. Surrounded by lush parks with paved infrastructure, district cooling tie-in, and corner garden frontage.",
      price: 17800000.0,
      area_size: 14200.0,
      area_unit: "sqft",
      address_text: "Lagoon Boulevard, Tilal Al Ghaf, Dubai, UAE",
      latitude: 25.0254,
      longitude: 55.2216,
      status: ListingStatus.available,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: broker.id,
      title: "MBR City District One Freehold Plot",
      description:
        "Rare freehold residential estate plot inside Mohammed Bin Rashid City District One, ten minutes from DIFC and Burj Khalifa. Enjoys quiet cul-de-sac positioning and immediate access to cycling tracks.",
      price: 22400000.0,
      area_size: 16800.0,
      area_unit: "sqft",
      address_text: "District One Phase III, MBR City, Dubai, UAE",
      latitude: 25.1618,
      longitude: 55.2914,
      status: ListingStatus.available,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: broker.id,
      title: "Sharjah Sustainable City Mixed-Use Parcel",
      description:
        "Strategic solar-ready mixed-use development tract in Al Rahmaniya corridor bordering Sharjah Sustainable City. Approved for boutique community retail and low-rise eco-courtyard residences with municipal utilities connected.",
      price: 14500000.0,
      area_size: 1.8,
      area_unit: "acre",
      address_text: "Al Rahmaniya Corridor, Sharjah, UAE",
      latitude: 25.3312,
      longitude: 55.5684,
      status: ListingStatus.negotiation,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: broker.id,
      title: "Yas Island Marina Residential Land",
      description:
        "Serviced waterfront residential land plot in Yas Acres North Marina Precinct, Abu Dhabi. Minutes from Yas Marina Circuit and international golf links, offering serene channel views and full Aldar master-community amenities.",
      price: 16200000.0,
      area_size: 19500.0,
      area_unit: "sqft",
      address_text: "North Marina Precinct, Yas Island, Abu Dhabi, UAE",
      latitude: 24.4782,
      longitude: 54.6054,
      status: ListingStatus.available,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1526495124232-a04e1849168c?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },

    // 4 Listings Owned by Demo Owner (seller@landconnect.com)
    {
      owner_id: seller.id,
      title: "Saadiyat Island Cultural District Villa Plot",
      description:
        "Private corner estate parcel in Saadiyat Cultural District just off Mamsha Promenade and Louvre Abu Dhabi. Levelled limestone sub-base with perimeter boundary markers and clean freehold ownership documentation.",
      price: 24500000.0,
      area_size: 15600.0,
      area_unit: "sqft",
      address_text: "Cultural District, Saadiyat Island, Abu Dhabi, UAE",
      latitude: 24.5368,
      longitude: 54.4342,
      status: ListingStatus.available,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: seller.id,
      title: "Emirates Hills Private Golf-Facing Plot",
      description:
        "Direct owner-held trophy residential plot inside Sector E of Emirates Hills overlooking Address Montgomerie lakes and fairways. Surrounded by established bespoke palaces with 24/7 private gatehouse security.",
      price: 46000000.0,
      area_size: 24000.0,
      area_unit: "sqft",
      address_text: "Sector E, Emirates Hills, Dubai, UAE",
      latitude: 25.0695,
      longitude: 55.1684,
      status: ListingStatus.negotiation,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1575517111478-7f6afd0973db?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: seller.id,
      title: "Al Furjan Prime Corner Residential Land",
      description:
        "Single-row corner villa land plot in Al Furjan West near green spine parkways and Sheikh Zayed Road interchange. Ready for immediate private family residence build with no service-charge backlog.",
      price: 7900000.0,
      area_size: 9800.0,
      area_unit: "sqft",
      address_text: "Al Furjan West, Jebel Ali District, Dubai, UAE",
      latitude: 25.0288,
      longitude: 55.1415,
      status: ListingStatus.available,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
    {
      owner_id: seller.id,
      title: "Jumeirah Bay Island Sea-View Parcel",
      description:
        "Ultra-rare freehold island parcel on Jumeirah Bay Island boasting unobstructed Arabian Sea horizons toward Bulgari Marina and the Downtown skyline. Direct private bridge access off Jumeirah Beach Road.",
      price: 89000000.0,
      area_size: 28000.0,
      area_unit: "sqft",
      address_text: "Jumeirah Bay Island, Jumeirah 2, Dubai, UAE",
      latitude: 25.2175,
      longitude: 55.2298,
      status: ListingStatus.available,
      images: [
        {
          image_url: "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=800&q=80",
          sort_order: 0,
        },
        {
          image_url: "https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=800&q=80",
          sort_order: 1,
        },
      ],
    },
  ];

  for (const item of uaeListings) {
    const { images, ...listingData } = item;
    const createdListing = await prisma.listing.create({
      data: {
        ...listingData,
        images: {
          create: images,
        },
      },
    });
    console.log(`Created listing: "${createdListing.title}" (${createdListing.id})`);
  }

  console.log("LandConnect UAE seeding completed successfully (12 listings seeded).");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
