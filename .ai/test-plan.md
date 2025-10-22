# Comprehensive Test Plan for "HealthyMeal" Project

---

### **1. Introduction and Testing Objectives**

This document constitutes a comprehensive test plan for the "HealthyMeal" web application, which enables users to manage culinary recipes and improve them using artificial intelligence. The project is based on a modern technology stack, including Astro, React, Supabase, and OpenRouter AI.

**Main objectives of the testing process are:**

- **Functional verification:** Ensuring that all application functions, including CRUD operations on recipes and AI interactions, work according to specification.
- **Quality and reliability assurance:** Identification and elimination of bugs to deliver a stable and reliable product to the end user.
- **Integration validation:** Checking the correctness of communication between front-end components, back-end (API), and external services (Supabase, OpenRouter AI).
- **Usability and accessibility assessment:** Ensuring that the user interface is intuitive, responsive, and compliant with accessibility standards (WCAG).
- **Risk identification:** Early detection of potential problems related to performance, security, and error handling.

### **2. Test Scope**

#### **Functionalities covered by tests (In-Scope):**

- **Recipe Management:**
  - Creating a new recipe (manual).
  - Displaying recipe list.
  - Editing existing recipe.
  - Deleting recipe.
  - Pagination and sorting of recipe list.
  - Navigation to recipe details.
- **AI Integration:**
  - Initiating the AI recipe suggestion generation process.
  - Displaying modal window with AI suggestion.
  - Accepting AI suggestion and saving new recipe.
  - Rejecting AI suggestion.
- **User Interface (UI):**
  - Real-time recipe creation form validation (error messages, character counters).
  - Proper functioning of UI components (buttons, loading spinners, modals).
  - Responsiveness of views on different devices.
- **API (Back-end):**
  - All API endpoints: `GET /api/recipes`, `POST /api/recipes`, `POST /api/generations`, `POST /api/generations/[id]/accept`, `POST /api/generations/[id]/reject`.
  - Input data validation (Zod schemas).
  - Edge case handling and returning proper HTTP status codes.
- **Accessibility:**
  - Basic WCAG compliance (contrast, keyboard navigation, ARIA attributes).

#### **Functionalities excluded from tests (Out-of-Scope):**

- Testing Supabase and OpenRouter AI infrastructure (we assume their reliability).
- Detailed performance and load testing, unless bottlenecks are identified.
- Testing third-party library and framework code (e.g., React, Astro).
- Penetration testing and advanced security testing.

### **3. Types of Tests to be Conducted**

The testing process will be divided into several levels to ensure comprehensive coverage.

- **Unit Tests:**
  - **Objective:** Verification of correct operation of individual functions, components, and modules in isolation.
  - **Scope:** Helper functions (`/lib/utils.ts`), Zod validation schemas, simple UI components (e.g., `CharacterCounter`), service logic (e.g., `GenerationService.sha256Hex`).

- **Integration Tests:**
  - **Objective:** Checking cooperation between different modules and system components.
  - **Scope:**
    - Recipe creation form (`RecipeCreateForm`) along with validation and child components.
    - AI modal (`AiReviewModal`) and its interaction with API.
    - Integration of back-end services (`RecipesService`, `GenerationService`) with Supabase client (using mocks or dedicated test database).

- **End-to-End (E2E) Tests:**
  - **Objective:** Verification of complete user flows from browser perspective, simulating real interactions.
  - **Scope:** Complete scenarios, e.g., from opening the main page, through creating a recipe with AI help, to verifying its appearance on the list.

- **API Tests:**
  - **Objective:** Direct testing of API endpoints to verify business logic, validation, error handling, and data contract.
  - **Scope:** Sending HTTP requests (GET, POST) to all defined endpoints and asserting responses (status codes, body content).

- **Accessibility Tests:**
  - **Objective:** Ensuring that the application is usable for people with disabilities.
  - **Scope:** Automatic scanning of key views (recipe list, form) for WCAG standard violations.

### **4. Test Scenarios for Key Functionalities**

#### **4.1. Recipe Creation and Display**

| Scenario ID | Description                                                                                   | Expected Result                                                                                           | Priority   | Test Type        |
| :---------- | :-------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :--------- | :--------------- |
| TC-REC-01   | **Manual recipe creation:** User fills form with correct data and clicks "Save Recipe".       | Recipe is saved to database. User is redirected to recipe list where the new entry is visible.            | **High**   | E2E, API         |
| TC-REC-02   | **Form validation:** User tries to save recipe with empty title or content.                   | Save buttons are inactive. After interacting with field and leaving it empty, error message is displayed. | **High**   | Integration, E2E |
| TC-REC-03   | **Character limit exceeded:** User enters text longer than allowed limit in title or content. | Character counter changes color to red. Form validation fails.                                            | **Medium** | Integration      |
| TC-REC-04   | **Recipe list display:** User opens main page.                                                | List of existing recipes is displayed. Loading spinner is visible during data fetching.                   | **High**   | E2E              |
| TC-REC-05   | **Pagination:** User clicks "Next" button on recipe list.                                     | Next page with recipes is displayed. Page number is updated.                                              | **Medium** | E2E              |
| TC-REC-06   | **List sorting:** User changes sorting criteria (tested through API).                         | Recipe list is returned in appropriate order.                                                             | **Medium** | API              |

#### **4.2. AI Recipe Generation**

| Scenario ID | Description                                                                                                                 | Expected Result                                                                                                                  | Priority   | Test Type        |
| :---------- | :-------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :--------- | :--------------- |
| TC-AI-01    | **AI suggestion generation and acceptance:** User fills form, clicks "Adjust with AI", then "Accept Proposal" in modal.     | AI suggestion is correctly displayed. After acceptance, AI recipe is saved, modal closes, and user is redirected to recipe list. | **High**   | E2E              |
| TC-AI-02    | **AI suggestion rejection:** User generates AI suggestion, then clicks "Reject" in modal.                                   | Modal is closed. No new recipe is created. User remains in form with original data.                                              | **High**   | E2E              |
| TC-AI-03    | **AI generation error handling:** API `/api/generations` returns 500 error.                                                 | Error message is displayed in form. "Adjust with AI" button becomes active again after attempt completion.                       | **High**   | Integration      |
| TC-AI-04    | **Suggestion acceptance error handling:** API `/api/generations/[id]/accept` returns error (e.g., 409 - already processed). | Appropriate error message is displayed in AI modal. User remains in modal.                                                       | **High**   | Integration      |
| TC-AI-05    | **AI modal closing:** User closes modal with "X" button, "Escape" key, or by clicking background.                           | Modal closes correctly, and focus returns to the element that opened it.                                                         | **Medium** | Integration, E2E |

### **5. Test Environment**

Three main environments will be configured:

- **Local Environment:**
  - **Purpose:** Development and running unit and integration tests by developers.
  - **Configuration:** Application running locally, connected to local Supabase instance (or dedicated Supabase development project). Environment variables (`.env`) with test keys for OpenRouter.

- **Test/Staging Environment:**
  - **Purpose:** Running E2E tests, API tests, and conducting manual acceptance tests.
  - **Configuration:** Application deployed on hosting platform (e.g., Vercel, Netlify). Dedicated, isolated Supabase project with test data. Environment should be the most faithful copy of production environment.

- **Production Environment:**
  - **Purpose:** Running smoke tests after each deployment to verify critical paths.
  - **Configuration:** Environment available to end users.

### **6. Testing Tools**

| Category                 | Tool                                          | Application                                                     |
| :----------------------- | :-------------------------------------------- | :-------------------------------------------------------------- |
| **JS Testing Framework** | **Vitest**                                    | Running unit and integration tests.                             |
| **UI Testing Library**   | **React Testing Library**                     | Testing React components in a way similar to user interactions. |
| **E2E Tests**            | **Playwright**                                | Automation of complete user scenarios in browser.               |
| **API Tests**            | **Postman** / **Insomnia** /                  | Manual and automatic testing of API endpoints.                  |
| **Accessibility Tests**  | **Axe** (integration with Cypress/Playwright) | Automatic scanning for accessibility issues.                    |
| **CI/CD**                | **GitHub Actions** (or other)                 | Automatic test execution after each push to repository.         |
| **Bug Management**       | **GitHub Issues** / **Jira**                  | Recording, tracking, and managing bug lifecycle.                |

### **7. Test Schedule**

Testing will be a continuous process, integrated with the software development cycle.

- **Development Phase (Development Sprint):**
  - Developers write unit and integration tests in parallel with implementing new features.
- **Before Merge (Pull Request):**
  - Automatic execution of all unit and integration tests by CI/CD.
  - Code review considering code quality and test coverage.
- **After Staging Deployment:**
  - Automatic execution of full E2E test suite.
  - Manual exploratory testing of key functionalities.
- **Before Production Deployment (Release Candidate):**
  - Full regression (automatic and manual) on Staging environment.
  - User Acceptance Testing (UAT), if applicable.
- **After Production Deployment:**
  - Execution of smoke test suite to verify critical paths.

### **8. Test Acceptance Criteria**

#### **Entry Criteria:**

- Code has been deployed to appropriate test environment.
- All unit and integration tests have completed successfully.
- Test environment is stable and available.

#### **Exit Criteria:**

- 100% of critical and high-priority test scenarios have completed successfully.
- Code coverage by unit and integration tests is at least 80%.
- No open bugs with critical (Blocker) and high (Critical) priority.
- All identified bugs have been reported and assessed.

### **9. Roles and Responsibilities**

| Role                        | Responsibility                                                                                                                                    |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **QA Engineer / Tester**    | Designing and maintaining test plan, creating and automating E2E and API scenarios, bug reporting, conducting regression and exploratory testing. |
| **Developer**               | Writing unit and integration tests, fixing reported bugs, maintaining code quality.                                                               |
| **Product Owner / Manager** | Defining acceptance criteria for functionalities, participating in acceptance testing (UAT), bug prioritization.                                  |
| **DevOps Engineer**         | Configuration and maintenance of test environments and CI/CD pipelines.                                                                           |

### **10. Bug Reporting Procedures**

All detected bugs will be reported in the bug tracking system (e.g., GitHub Issues). Each report should contain the following elements:

- **Title:** Concise and unambiguous description of the problem.
- **Environment:** Application version, browser, operating system.
- **Steps to Reproduce:** Numbered list of actions leading to the bug occurrence.
- **Expected Result:** What should happen.
- **Actual Result:** What actually happened.
- **Severity/Priority:**
  - **Blocker:** Prevents further testing or use of key functionality.
  - **Critical:** Serious bug in key functionality, but workaround exists.
  - **Major:** Bug in important functionality.
  - **Minor:** Small bug, e.g., typo or aesthetic issue.
- **Attachments:** Screenshots, video recordings, console logs.
