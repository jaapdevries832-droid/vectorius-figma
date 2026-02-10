# PRD 4 Test Instructions

**Date**: 2026-02-05
**Branch**: lesson-54
**Tester**: _______________

---

## Pre-Test Setup

1. Ensure you have access to these accounts:
   - **Student account**: Annie (anniedevries@email.com)
   - **Parent account**: Jaap de Vries (jpdvrs@yahoo.com)
   - **Advisor account**: (if available)

2. Clear browser cache/localStorage if testing chat persistence

---

## Test Suite A: Parent-Student Linking (S4-A)

### A1: Parent Can See Linked Students
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Login as parent (Jaap) | Parent dashboard loads | |
| 2 | Check "Your students" section | Linked students appear (no recursion error) | |
| 3 | Select a student from dropdown | Student data loads correctly | |

### A2: Parent Invite Flow (New Parent)
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Login as student (Annie) | Student dashboard loads | |
| 2 | Navigate to Settings or find "Invite Parent" | Invite code generation available | |
| 3 | Generate invite code | Code displayed | |
| 4 | Logout | Redirected to login | |
| 5 | Navigate to `/join/parent` | Parent signup form appears | |
| 6 | Create new parent with invite code | Account created, redirected to `/parent` | |
| 7 | Verify student appears | Annie visible in linked students | |

---

## Test Suite B: Classes in Assignment Dropdown (S4-B)

### B1: Student-Created Classes Appear
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Login as student (Annie) | Dashboard loads with profile | |
| 2 | Go to Dashboard | "My Classes" section visible | |
| 3 | Create new class "Test Class PRD4" | Class created successfully | |
| 4 | Navigate to Assignments tab | Assignments page loads | |
| 5 | Click "Add Assignment" | Modal opens | |
| 6 | Open class dropdown | "Test Class PRD4" appears in list | |
| 7 | Select class, fill details, save | Assignment created with correct class | |
| 8 | Verify assignment card | Shows "Test Class PRD4" | |

### B2: Existing Scheduled Classes Still Work
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Verify existing classes with schedules | Appear in dropdown | |
| 2 | Create assignment with scheduled class | Works correctly | |

---

## Test Suite C: Chat Message Persistence (S4-C)

### C1: Messages Persist Across Tab Switches
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Login as student | Dashboard loads | |
| 2 | Navigate to AI Chat tab | Chat interface with welcome message | |
| 3 | Send message "Hello, test 1" | AI responds | |
| 4 | Send message "Test 2" | Second response received | |
| 5 | Click "Assignments" tab | Navigate away from chat | |
| 6 | Click "AI Chat" tab | Return to chat | |
| 7 | Verify conversation | Both messages + responses visible | |

### C2: Messages Persist After Page Refresh
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | With existing conversation, press F5 | Page refreshes | |
| 2 | Navigate to AI Chat | Previous conversation still visible | |

### C3: Clear Chat Works
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | With existing conversation | Messages visible | |
| 2 | Click trash icon (Clear Chat) | Confirmation or immediate clear | |
| 3 | Verify chat reset | Only welcome message remains | |

### C4: 24-Hour Expiry (Manual Verification)
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open browser DevTools > Application > Local Storage | | |
| 2 | Find `vectorius_chat_messages` key | Contains `timestamp` field | |
| 3 | Verify timestamp is recent | Within last few minutes | |

---

## Test Suite D: Parent Chat Interface (S4-D)

### D1: AI Assistant Menu Item
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Login as parent | Parent dashboard loads | |
| 2 | Check sidebar menu | "AI Assistant" tab visible (teal icon) | |

### D2: Parent Chat Interface Loads
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "AI Assistant" tab | Chat interface loads | |
| 2 | Verify header color | Green/teal gradient (not purple) | |
| 3 | Verify welcome message | "I'm here to help you support your child's learning" | |

### D3: Parent-Specific Quick Prompts
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click dropdown (chevron) button | Quick prompts menu opens | |
| 2 | Verify categories | "Homework Help", "Study Skills", "Motivation", "Subject Help" | |
| 3 | Click a prompt | Text populates input field | |

### D4: Parent Chat Functionality
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Send message "How can I help my child study?" | AI responds | |
| 2 | Switch to Reports tab | Navigate away | |
| 3 | Return to AI Assistant | Conversation persisted | |
| 4 | Click Clear Chat | Resets to welcome message | |

### D5: Separate Chat Storage
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Have conversation as parent | Messages saved | |
| 2 | Logout, login as student | Student dashboard | |
| 3 | Go to AI Chat | Student's separate conversation (or welcome) | |
| 4 | Open DevTools > Local Storage | Two keys: `vectorius_chat_messages` and `vectorius_parent_chat_messages` | |

---

## Test Suite E: Regression Tests

### E1: Student Profile Loads
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Login as student (Annie) | Dashboard loads | |
| 2 | Check sidebar | Student name displayed (not "No student profile found") | |
| 3 | Check main dashboard | No "Unable to load profile" error | |
| 4 | Verify classes visible | Annie's classes displayed | |
| 5 | Verify assignments visible | Annie's assignments displayed | |

### E2: No Infinite Recursion Errors
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Login as parent | Dashboard loads | |
| 2 | Check for errors | No "infinite recursion" message | |
| 3 | View student data | Data loads without errors | |

### E3: Schedule Page Works
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | As student, go to Schedule | Weekly planner loads | |
| 2 | Verify classes display | Scheduled classes appear | |

---

## Summary

| Suite | Description | Status |
|-------|-------------|--------|
| A | Parent-Student Linking | |
| B | Classes in Assignment Dropdown | |
| C | Chat Message Persistence | |
| D | Parent Chat Interface | |
| E | Regression Tests | |

**Overall Status**: _______________

**Notes/Issues Found**:
```




```

**Tester Signature**: _______________ **Date**: _______________
