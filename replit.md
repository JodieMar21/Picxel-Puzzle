# Picxel Studio

## Overview

This application converts uploaded images into pixelated construction guides by pixelating them and mapping colors to a custom palette. Users can upload images, configure board layouts, and receive detailed construction instructions with color counts and board arrangements.

## Recent Changes (January 2025)

✓ Click-to-expand brick view with full-screen popup
✓ Interactive pixel editing with click-and-drag painting
✓ Batch undo/redo system for paint strokes
✓ Clean full-screen popup without scrolling or text overlays
✓ Visual colour guides generated as separate pages per board
✓ Brick studs visualization in both normal and expanded views
✓ Enhanced visual guide with popup modal instead of auto-downloads
✓ Larger, print-optimized guide images with better visibility
✓ Added project overview page with full brick image and complete colour list
✓ Individual Save and Print buttons for each guide page
✓ Removed all "LEGO" references from the entire application
✓ Updated to use Australian English spelling (colour instead of color)
✓ Changed "Lego construction overview" to "Picxel Overview"
✓ Converted all LEGO color types to BrickColor types
✓ Updated API endpoints and function names to use generic brick terminology
✓ Implemented proper file save dialogs using File System Access API
✓ Added fallback download method for browsers without native save dialog support
✓ Both Save Project and Visual Guide Save buttons now show file picker dialogs
✓ Created centralized file-saver utility for consistent save functionality
✓ Added PostgreSQL database support for persistent project storage
✓ Implemented "Save to App" functionality for keeping projects within the application
✓ Created "My Projects" page with project management features (view, download, delete)
✓ Added navigation between home page and projects page
✓ Projects now store complete pixelation results for later access
✓ Database stores project metadata including creation/update timestamps

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses a modern React-based frontend built with:
- **React 18** with TypeScript for type safety
- **Vite** as the build tool and development server
- **Tailwind CSS** with shadcn/ui components for styling
- **TanStack Query** for server state management
- **Wouter** for client-side routing
- **React Hook Form** with Zod validation for form handling

The frontend follows a component-based architecture with clear separation between UI components, pages, and utility functions.

### Backend Architecture
The backend is built with:
- **Express.js** server with TypeScript
- **Drizzle ORM** with PostgreSQL for data persistence
- **Multer** for file upload handling
- **Sharp** for image processing
- In-memory storage fallback for development

The server follows a RESTful API pattern with middleware for request logging and error handling.

## Key Components

### Image Processing Pipeline
1. **Upload Handler**: Validates file types (PNG, JPG, JPEG) and size limits (10MB)
2. **Image Pixelation**: Converts images to brick-compatible pixel grids
3. **Color Mapping**: Maps image colors to a 39-color custom palette
4. **Board Layout**: Organizes pixels into 32x32 baseplate configurations

### UI Components
- **ImageUpload**: Drag-and-drop file upload with validation
- **BoardConfiguration**: Settings for board count and layout arrangement
- **ColorPalette**: Display of available brick colours
- **ProcessingView**: Real-time processing status with progress indication
- **ResultsView**: Final output with downloadable guides and statistics

### Data Models
```typescript
Project {
  id: string
  name: string
  originalImageUrl: string
  pixelatedImageUrl?: string
  boardCount: number
  boardLayout: string
  colorData?: ColorUsage[]
  constructionGuideUrl?: string
  status: 'processing' | 'completed' | 'failed'
}
```

## Data Flow

1. **Image Upload**: User selects image → Validation → Temporary storage → Project creation
2. **Configuration**: User sets board count and layout → Form validation → Configuration storage
3. **Processing**: Image analysis → Color mapping → Pixelation → Board generation → Guide creation
4. **Results**: Processed data → UI rendering → Download options

## External Dependencies

### Development & Build Tools
- **Vite**: Frontend build system with React plugin
- **TypeScript**: Type checking and compilation
- **ESBuild**: Backend bundling for production

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless component primitives
- **Lucide React**: Icon library

### Backend Libraries
- **Sharp**: High-performance image processing
- **Multer**: Multipart form data handling
- **Connect-pg-simple**: PostgreSQL session store

### Database
- **Drizzle ORM**: Type-safe database operations
- **@neondatabase/serverless**: PostgreSQL driver for serverless environments

## Deployment Strategy

### Development
- **Vite dev server** for frontend with HMR
- **tsx** for running TypeScript server directly
- **Concurrent development** with unified logging

### Production Build
- **Frontend**: Vite builds to `dist/public`
- **Backend**: ESBuild bundles server to `dist/index.js`
- **Database**: Drizzle migrations in `migrations/` directory

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **NODE_ENV**: Environment detection
- **File uploads**: Temporary storage in `uploads/` directory

The application is designed to work seamlessly in both development and production environments, with proper error handling, logging, and graceful fallbacks for missing dependencies.