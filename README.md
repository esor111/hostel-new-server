# 🏨 Kaha Hostel Management System - NestJS Backend

A comprehensive hostel management system built with NestJS, TypeORM, and PostgreSQL.

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kaha_user
DB_PASSWORD=password
DB_NAME=kaha_hostel_db
NODE_ENV=development
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
```bash
# Interactive setup (recommended)
npm run db:setup

# Or quick commands:
npm run db:migrate  # Migration mode + seeding
npm run db:sync     # Sync mode + seeding (dev only)
```

### 4. Start Development Server
```bash
npm run start:dev
```

### 5. Seed Data via API
```bash
# Test seeding endpoints
npm run test:seed

# Or manually seed all data
curl -X POST http://localhost:3001/api/v1/seed/all
```

## 📋 Available Scripts

### Development
| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start development server with hot reload |
| `npm run start:debug` | Start server in debug mode |
| `npm run build` | Build production bundle |
| `npm run start:prod` | Start production server |

### Database Management
| Command | Description |
|---------|-------------|
| `npm run db:setup` | Interactive database setup wizard |
| `npm run db:migrate` | Run migrations + seed data |
| `npm run db:sync` | Sync schema + seed data (dev only) |
| `npm run db:reset` | Drop + recreate + seed (dev only) |
| `npm run migrate` | Migration management CLI |

### Data Seeding
| Command | Description |
|---------|-------------|
| `npm run test:seed` | Test API seeding endpoin



while request for the room booking for the request json will be
{
  "data": {
    "contactPerson": {
      "name": "Sabiln",
      "phone": "98621515111",
      "email": "Saw@sadas.cas"
    },
    "guests": [
      {
        "bedId": "bed1",
        "name": "abc",
        "age": "20",
        "gender": "Male"
      },
      {
        "bedId": "bed6",
        "name": "xyz",
        "age": "15",
        "gender": "Female"
      }
    ]
  }
}

by using json what are the places going to be effected?
information 
course & institution ???
where is the actual GAP?


is there any api related to room booking not the bed booking?
what are information that are irrrelevent
information gap between single guest booking and multi guest booking

mismatch with bedids


need to talk about the room layout and bed  layout



for now we are not going to do the cache implementation

also no need to do PHASE 6: DEPLOYMENT & MIGRATION



this is user token

curl -X 'POST' \
  'https://dev.kaha.com.np/main/api/v3/auth/login' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "contactNumber": "9813870231",
  "password": "ishwor19944"
}'
Request URL
https://dev.kaha.com.np/main/api/v3/auth/login
Server response
Code	Details
201	
Response body
Download
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU3ODQ5NDM0fQ.bSuPcllwdDO6oRslCS6rjH91JMbn3vYlkdb5p4xlR_I",
  "role": "admin"
}

user must have business to login in the web so  after user login  need hit another api
(business is hostel)

Curl

curl -X 'GET' \
  'https://dev.kaha.com.np/main/api/v3/businesses/my' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU3ODQ5NDM0fQ.bSuPcllwdDO6oRslCS6rjH91JMbn3vYlkdb5p4xlR_I'
Request URL
https://dev.kaha.com.np/main/api/v3/businesses/my
Server response 

{
  "meta": {
    "page": 1,
    "totalRecords": 8,
    "recordsPerPage": 10,
    "previous": 0,
    "next": null,
    "lastPage": 1,
    "hasNext": false
  },
  "data": [
    {
      "id": "c199ac90-7b51-42e0-8caa-a24c45e2c30f",
      "kahaId": "S-58D507",
      "tag": "YUNNY",
      "name": "Sudnny",
      "entity": "Sampada",
      "email": null,
      "contact": "9813870231",
      "landline": "9869696969",
      "mapAddress": {
        "id": "478d49ec-bcff-4c86-9b0c-8735fefbed0a",
        "createdAt": "2025-07-11T08:08:30.777Z",
        "updatedAt": "2025-07-11T08:08:30.777Z",
        "deletedAt": null,
        "street": "Bagmati, Nepal",
        "province": "3",
        "district": "24",
        "municipality": "236",
        "wardNo": "6",
        "generalAddress": "Bagmati, Nepal",
        "latitude": null,
        "longitude": null,
        "country": "Nepal",
        "additionalInfo": "",
        "location": {
          "type": "Point",
          "coordinates": [
            27.564152588,
            85.865588039
          ]
        },
        "googlePlacesData": {
          "name": "Bagmati",
          "country": "Nepal",
          "isoCountryCode": "NP",
          "administrativeArea": "Bagmati"
        }
      },
      "location": {
        "type": "Point",
        "coordinates": [
          27.564152588,
          85.865588039
        ]
      },
      "createdAt": "2025-07-11T08:08:30.777Z",
      "address": "Bagmati, Nepal",
      "panIsVat": false,
      "tagLine": "Aah",
      "description": "",
      "website": "",
      "workingDaysAndHours": {
        "friday": "0:0-23:59",
        "monday": "0:0-23:59",
        "sunday": "0:0-23:59",
        "tuesday": "0:0-23:59",
        "saturday": "0:0-23:59",
        "thursday": "0:0-23:59",
        "wednesday": "0:0-23:59"
      },
      "available": false,
      "delivery": false,
      "pickup": false,
      "isOfficial": false,
      "avatar": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/4c454862763150577945586f3f4b3f49254e2d70337c254d254d5431_1752218681074",
      "coverImageUrl": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/4c5643242e2a7438342c733d3f4b78624d5f6641787778626e2c5269_1752218699797",
      "buildingImageUrl": "",
      "buildingInformation": "",
      "gallery": [],
      "floorNo": "",
      "homeId": null,
      "view360Url": null,
      "additionalInfo": null,
      "rejectionReason": null,
      "status": {
        "value": "unclaimed",
        "type": "business_status"
      },
      "category": {
        "id": "23dd1b13-a696-4c21-bb6d-2b8577e9e5c4",
        "createdAt": "2024-10-07T11:00:38.934Z",
        "updatedAt": "2024-12-03T03:44:36.936Z",
        "deletedAt": null,
        "name": "Sampada",
        "iconUrl": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/4c594c2449666b422d716b437e456a7578626a755225665178626651_1733130885119",
        "markerUrl": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/public_kaha_1720070907007_home_icon.png",
        "level": null,
        "isActive": true,
        "entityPrefix": "s",
        "parent": null
      },
      "latitude": 27.564152588,
      "longitude": 85.865588039,
      "averageRating": null,
      "businessRejections": [],
      "isVisible": true,
      "secondaryContact": "9869696969",
      "hasOwnershipClaim": false,
      "owner": {
        "id": "afc70db3-6f43-4882-92fd-4715f25ffc95",
        "fullName": "ishwor gautam"
      },
      "roles": "business_super_admin"
    },
    {
      "id": "8f447751-d952-42cd-a04c-ed257d3464e6",
      "kahaId": "B-08F9EF",
      "tag": "ISHWOR",
      "name": "ishwor-business",
      "entity": "Business",
      "email": null,
      "contact": "9813870231",
      "landline": null,
      "mapAddress": {
        "id": "dba876dd-e3c3-42cd-ab4a-94fd4c7717ad",
        "createdAt": "2025-04-27T05:37:37.093Z",
        "updatedAt": "2025-04-27T05:37:37.093Z",
        "deletedAt": null,
        "street": "Sagarmatha Marg, Kathmandu, Bagmati Province, Nepal",
        "province": "1",
        "district": "2",
        "municipality": "81",
        "wardNo": "3",
        "generalAddress": "Sagarmatha Marg, Kathmandu, Bagmati Province, Nepal",
        "latitude": null,
        "longitude": null,
        "country": "Nepal",
        "additionalInfo": null,
        "location": {
          "type": "Point",
          "coordinates": [
            27.69981756,
            85.32825809
          ]
        },
        "googlePlacesData": {
          "name": "M8XH+X8F",
          "street": "M8XH+X8F",
          "country": "Nepal",
          "locality": "Kathmandu",
          "postalCode": "44600",
          "thoroughfare": "Sagarmatha Marg",
          "isoCountryCode": "NP",
          "administrativeArea": "Bagmati Province",
          "subAdministrativeArea": "Kathmandu"
        }
      },
      "location": {
        "type": "Point",
        "coordinates": [
          27.69981756,
          85.32825809
        ]
      },
      "createdAt": "2025-04-27T05:37:37.093Z",
      "address": "Sagarmatha Marg, Kathmandu, Bagmati Province, Nepal",
      "panIsVat": false,
      "tagLine": null,
      "description": "We have not added a description yet.",
      "website": null,
      "workingDaysAndHours": {
        "friday": "9:0-17:0",
        "monday": "9:0-17:0",
        "sunday": "9:0-17:0",
        "tuesday": "9:0-17:0",
        "saturday": "10:0-17:0",
        "thursday": "9:0-17:0",
        "wednesday": "9:0-17:0"
      },
      "available": false,
      "delivery": false,
      "pickup": false,
      "isOfficial": false,
      "avatar": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/4c4b466a335b785b6b2552253f3d52384e594f38454b5331515b6e2b_1745732244365",
      "coverImageUrl": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/4c4b466a335b785b6b2552253f3d52384e594f38454b5331515b6e2b_1745732249239",
      "buildingImageUrl": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/4c4b466a335b785b6b2552253f3d52384e594f38454b5331515b6e2b_1745732235398",
      "buildingInformation": null,
      "gallery": null,
      "floorNo": null,
      "homeId": null,
      "view360Url": null,
      "additionalInfo": null,
      "rejectionReason": null,
      "status": {
        "value": "unverified",
        "type": "business_status"
      },
      "category": {
        "id": "a5363951-3c77-473b-be80-5755f363ce2a",
        "createdAt": "2024-10-07T11:00:39.131Z",
        "updatedAt": "2024-10-07T11:00:39.131Z",
        "deletedAt": null,
        "name": "Boys Hostel",
        "iconUrl": "https://kaha-api-test.masovison.com/categories/it_icon.png",
        "markerUrl": "https://kaha-api-test.masovison.com/categories/it_marker.png",
        "level": null,
        "isActive": true,
        "entityPrefix": null,
        "parent": {
          "id": "8d4c71ac-b5f2-4019-8414-fdc01ecaf8c4",
          "createdAt": "2024-10-07T11:00:39.128Z",
          "updatedAt": "2024-10-07T11:00:39.128Z",
          "deletedAt": null,
          "name": "Hostel",
          "iconUrl": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/public_kaha_1713426321421_hostel_icon.png",
          "markerUrl": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/public_kaha_1713426329186_hostel_icon.png",
          "level": null,
          "isActive": true,
          "entityPrefix": null,
          "parent": {
            "id": "7c3f932a-d715-4327-af70-2618e7eba609",
            "createdAt": "2024-10-07T11:00:38.899Z",
            "updatedAt": "2024-10-16T11:40:12.230Z",
            "deletedAt": null,
            "name": "Business",
            "iconUrl": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/4c59454430583f77442456586e23573f526b6164395a563f25314e64_1729078809356",
            "markerUrl": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/public_kaha_1720070907007_home_icon.png",
            "level": null,
            "isActive": true,
            "entityPrefix": "b"
          }
        }
      },
      "latitude": 27.69981756,
      "longitude": 85.32825809,
      "averageRating": null,
      "businessRejections": [],
      "isVisible": true,
      "secondaryContact": null,
      "hasOwnershipClaim": false,
      "owner": {
        "id": "afc70db3-6f43-4882-92fd-4715f25ffc95",
        "fullName": "ishwor gautam"
      },
      "roles": "business_super_admin"
    },
    {
      "id": "0df89bff-c599-479f-9269-55b6970cebb2",
      "kahaId": "B-D125B0",
      "tag": "HOTELSIMKHOLACS0299",
      "name": "Hotel Simkhola & Lodge",
      "entity": "Business",
      "email": "",
      "contact": "9813870231",
      "landline": "9779855045666",
      "mapAddress": {
        "id": "4154babd-3d56-49e8-ad3a-7364407397da",
        "createdAt": "2024-08-27T21:25:48.440Z",
        "updatedAt": "2024-08-27T21:25:48.440Z",
        "deletedAt": null,
        "street": "Kulekhani Dam",
        "province": "2",
        "district": "20",
        "municipality": "383",
        "wardNo": "1",
        "generalAddress": "Kulekhani Dam",
        "latitude": 27.58118906,
        "longitude": 85.15607007,
        "country": "Nepal",
        "additionalInfo": "test additional ingo map",
        "location": {
          "type": "Point",
          "coordinates": [
            27.58118906,
            85.15607007
          ]
        },
        "googlePlacesData": "{\"name\": \"Hotel Simkhola & Lodge\", \"street\": \"Kulekhani Dam\", \"country\": \"Nepal\", \"locality\": \"Makawanpur\", \"postalCode\": \"44800\", \"isoCountryCode\": \"NP\", \"administrativeArea\": \"Bagmati Province\", \"subAdministrativeArea\": \"Makawanpur\"}"
      },
      "location": {
        "type": "Point",
        "coordinates": [
          27.58118906,
          85.15607007
        ]
      },
      "createdAt": "2024-08-27T21:25:48.444Z",
      "address": "Kulekhani Dam",
      "panIsVat": false,
      "tagLine": null,
      "description": "Hotel Simkhola & Lodge Charging Station, situated on Kulekhani Dam in Makawanpur, offers 1 available slot for charging ,along with amenities such as wifi, parking, food, coffee, accomodation, restroom facilities.",
      "website": "",
      "workingDaysAndHours": {
        "friday": "9:0-17:0",
        "monday": "10:0-17:0",
        "sunday": "11:0-17:0",
        "tuesday": "9:0-17:0",
        "saturday": "8:0-17:0",
        "thursday": "9:0-17:0",
        "wednesday": "10:0-17:0"
      },
      "available": true,
      "delivery": false,
      "pickup": false,
      "isOfficial": false,
      "avatar": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/public_kaha_1724725917570_image_cropper_1724725914605.jpg",
      "coverImageUrl": "https://kaha-assets-dev.s3.ap-south-1.amazonaws.com/public_kaha_1724725922438_image_cropper_1724725919850.jpg",
      "buildingImageUrl": null,
      "buildingInformation": null,
      "gallery": [],
      "floorNo": null,
      "homeId": null,
      "view360Url": null,
      "additionalInfo": null,
      "rejectionReason": null,
      "status": {


        we will see this kind of data user can choose the hostel to switch 
        form this only use the name, address, avaatoar and kahaid in the list when user clikc one of them
        he can switch


        for swtiching profile(get the token for that hostel)we will going to use that token for every api
        in the web 
        Responses
Curl

curl -X 'POST' \
  'https://dev.kaha.com.np/main/api/v3/auth/switch-profile' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiaWF0IjoxNzU3ODQ5NDM0fQ.bSuPcllwdDO6oRslCS6rjH91JMbn3vYlkdb5p4xlR_I' \
  -H 'Content-Type: application/json' \
  -d '{
  "businessId": "c199ac90-7b51-42e0-8caa-a24c45e2c30f"
}'
Request URL
https://dev.kaha.com.np/main/api/v3/auth/switch-profile
Server response
Code	Details
201	
Response body
Download
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiYnVzaW5lc3NJZCI6ImMxOTlhYzkwLTdiNTEtNDJlMC04Y2FhLWEyNGM0NWUyYzMwZiIsImlhdCI6MTc1Nzg0OTc1NH0.9uGVtXS-STMI_YWdX1NetJyJbm9S_0EpxleBSdtXc5Y",
  "role": "business_super_admin"
}

we will use this (this is hostel token)  for that whole seession 


in the service where you did
      .where('room.hostelId = :hostelId', { hostelId }); (this is only for room wherever you use this)
      also figureout and see another service might use this kind of stuff
      i want this is if(hosteId) if there is not hosteliD retun all the data if hostelId come into request then filter with that hostelId  understand ?? 
     then test the apis  everything works expecte




