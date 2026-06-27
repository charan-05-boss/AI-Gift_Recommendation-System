# AI Gift Recommendation Assistant - API Specification

## `POST /api/recommendations`

Generate gift recommendations based on user input.

### Request Body

```json
{
  "occasion": "Birthday",
  "age": 30,
  "relation": "Friend",
  "budget": 100,
  "preferences": "Loves technology, outdoors, and reading"
}
```

### Response (Success)

```json
{
  "success": true,
  "recommendations": [
    {
      "title": "Kindle Paperwhite",
      "description": "Perfect for a friend who loves reading and technology.",
      "estimatedCost": 130
    },
    {
      "title": "Smart Water Bottle",
      "description": "Great for outdoor activities, tracks hydration.",
      "estimatedCost": 45
    }
  ]
}
```

### Response (Error)

```json
{
  "success": false,
  "error": "Budget must be a positive number."
}
```
