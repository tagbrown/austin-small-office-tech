# Repository Guidelines

Guidelines for when to create new repositories and how to organize projects.

## When to Create a New Repository

Create a new repository when:

### 1. Independent Deployment
- The project has its own release cycle
- It can be deployed without deploying other projects
- Different environments or hosting platforms are used

### 2. Separate Ownership
- A different team or person will maintain the code
- Different access controls are needed
- External contributors will work on it (open source)

### 3. Distinct Technology Stack
- The project uses a fundamentally different language or framework
- Build and test processes are completely different
- Dependencies don't overlap with existing projects

### 4. Reusable Components
- Shared libraries used by multiple projects
- Internal tools or utilities
- APIs that serve multiple consumers

### 5. Client or Project Isolation
- Client-specific work that shouldn't mix with other clients
- Proof of concepts or experiments
- Archived projects that are no longer active

## When to Keep Code in the Same Repository

Keep code together when:

- Changes frequently happen across components simultaneously
- Tight coupling exists between parts of the system
- The same team owns and deploys everything together
- The project is small and doesn't warrant separation overhead

## Repository Naming Conventions

Use clear, descriptive names:

- `company-website` - Main marketing website
- `company-api` - Backend API services
- `company-docs` - Documentation
- `tool-name` - Standalone tools or utilities

Avoid:
- Generic names like `project1` or `test`
- Abbreviations that aren't widely understood
- Names that don't indicate the repository's purpose

## Before Creating a New Repository

Ask yourself:

1. Does this need to be deployed independently?
2. Will different people maintain this code?
3. Would keeping it in an existing repo cause problems?
4. Is the overhead of a new repo worth the benefits?

If you answered "no" to all of these, consider keeping the code in an existing repository.
