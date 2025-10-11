# 🧪 MANUAL TESTING GUIDE - Complete Workflow

## Prerequisites

✅ **Before Starting:**
1. Development server is running: `npm run dev`
2. Server accessible at: http://localhost:5173
3. Database is seeded with demo users

## Demo Credentials

```
CHW:    chw@demo.com / demo123
ASHA:   asha@demo.com / demo123
Doctor: doctor@demo.com / demo123
Admin:  admin@demo.com / demo123
```

---

## 🎯 TEST 1: Complete Workflow (CHW → ASHA → Notification)

### Step 1: CHW Creates a Case

1. **Login as CHW**
   - Navigate to: http://localhost:5173/
   - Click "Login" or go to `/auth`
   - Enter: `chw@demo.com` / `demo123`
   - Click "Sign In"
   - ✅ Should redirect to `/chw-new`

2. **Create New Case**
   - Ensure you're on the "New Case" tab
   - Fill in patient information:
     ```
     Name: John Doe
     Age: 45
     Gender: Male
     Phone: 9876543210
     Village: Test Village
     ```
   - Select symptoms:
     - [x] fever
     - [x] cough  
     - [x] difficulty breathing
   
   - Fill vital signs:
     ```
     Temperature: 102.5°F
     Blood Pressure: 140/90
     Heart Rate: 95
     Oxygen Saturation: 94%
     ```
   
   - Add notes: "Patient has been feeling unwell for 3 days"
   
   - Click "🤖 Calculate Risk Score"
   - ✅ Should show risk assessment (likely HIGH or CRITICAL due to symptoms)
   
   - Click "💾 Save Case"
   - ✅ Should show success message: "Case saved successfully! ID: xxx"
   - ✅ Should auto-switch to "Case History" tab after 2 seconds
   - ✅ New case should appear in the list with status "PENDING"

3. **Verify Case in History**
   - Check "Case History" tab
   - ✅ Should see the newly created case
   - ✅ Status badge should be yellow "PENDING"
   - ✅ Statistics should show: Total Cases +1, Pending +1
   - Click "View Details" on the case
   - ✅ Should open modal with full case information
   - ✅ Patient details should match what you entered
   - Close modal

**📝 Note the Case ID for later steps**

---

### Step 2: ASHA Reviews the Case

1. **Logout from CHW**
   - Click on profile/logout (if available) or clear session
   - Navigate back to: http://localhost:5173/auth

2. **Login as ASHA**
   - Enter: `asha@demo.com` / `demo123`
   - Click "Sign In"
   - ✅ Should redirect to `/asha`

3. **Verify Case Appears**
   - Wait for ASHA dashboard to load
   - ✅ Should see loading spinner briefly
   - ✅ Dashboard statistics should show:
     - Total Cases should include the new case
     - Pending Review should show at least 1
   - ✅ CHW list should show "CHW Name" (not hardcoded "Sample CHW")
   - ✅ Case list should show the newly created case
   - ✅ Case should have yellow "pending_review" badge

4. **Review Case Details**
   - Click on the newly created case
   - ✅ Should open case details panel
   - ✅ Patient information should match (John Doe, 45, Male)
   - ✅ Symptoms should be displayed correctly
   - ✅ Vital signs should be shown
   - ✅ Risk assessment should be visible

5. **Approve the Case**
   - In the case details panel, locate action buttons
   - Click "Approve" or "✅ Approve Case" button
   - Enter approval notes: "Case reviewed and approved. Treatment plan looks good."
   - Click "Confirm" or "Submit"
   - ✅ Should show loading spinner
   - ✅ Should show success message: "Case approved successfully!"
   - ✅ Case should disappear from pending list (or status changes to "approved")
   - ✅ Statistics should update:
     - Pending Review count should decrease
     - Cases Approved should increase

---

### Step 3: CHW Receives Notification

1. **Logout from ASHA**
   - Logout or clear session
   - Navigate to: http://localhost:5173/auth

2. **Login back as CHW**
   - Enter: `chw@demo.com` / `demo123`
   - Click "Sign In"
   - ✅ Should redirect to `/chw-new`

3. **Check Notification Bell**
   - Look at the top-right header area
   - ✅ Should see a bell icon (🔔)
   - ✅ Bell should have a blue badge with unread count (if notification was created)
   - Click on the bell icon
   - ✅ Should open notification dropdown panel

4. **Verify Notification**
   - In the notification panel:
   - ✅ Should see notification about case approval
   - ✅ Message should mention "approved" or "Case approved"
   - ✅ Should show timestamp (e.g., "Just now", "2m ago")
   - ✅ Unread notifications should have blue background
   - Click on the notification
   - ✅ Should mark as read (background changes to white)
   - ✅ Unread count badge should decrease

5. **Verify Case Status Updated**
   - Click on "Case History" tab
   - Find the case you created
   - ✅ Status badge should now be GREEN "APPROVED"
   - ✅ Should see green box with "✅ Approved by ASHA"
   - ✅ Should show ASHA feedback: "Case reviewed and approved..."
   - Click "View Details"
   - ✅ In modal, ASHA Review section should be visible
   - ✅ Should show approval message and feedback

---

## 🔍 TEST 2: Database Verification

### Using Prisma Studio

1. **Open Prisma Studio**
   ```bash
   cd /home/chirag/Downloads/spark-field
   npx prisma studio
   ```
   - Should open in browser at: http://localhost:5555

2. **Verify Case Table**
   - Navigate to "Case" model
   - Find the case you created (search by patient name "John Doe")
   - ✅ `status` field should be "APPROVED"
   - ✅ `userId` should match CHW user ID
   - ✅ `priority` should be set (e.g., 75+ for high risk)
   - ✅ `createdAt` should match creation time
   - ✅ `updatedAt` should be more recent (after approval)

3. **Verify AuditLog Table**
   - Navigate to "AuditLog" model
   - Filter or search for recent entries
   - ✅ Should find entry with:
     - `action` = "case_review"
     - `resource` = "case:{your-case-id}"
     - `userId` = ASHA user ID
     - `outcome` = "success"
     - `timestamp` = recent timestamp

4. **Verify Alert Table**
   - Navigate to "Alert" model
   - Find alert for your case
   - ✅ Should find entry with:
     - `caseId` = your case ID
     - `userId` = CHW user ID
     - `level` = "HIGH" or "CRITICAL" (depending on priority)
     - `message` = mentions case approval
     - `status` = "READ" (if you clicked notification) or "PENDING"
     - `readAt` = timestamp (if you clicked notification)

---

## ⚡ TEST 3: API Performance

### Using Browser DevTools

1. **Open Developer Tools**
   - Press `F12` or right-click → "Inspect"
   - Go to "Network" tab
   - Ensure "Preserve log" is checked

2. **Test CHW List API**
   - Login as ASHA
   - Navigate to `/asha`
   - In Network tab, find request to `/api/chw`
   - ✅ Status should be 200 OK
   - ✅ Response time should be < 200ms (check "Time" column)
   - ✅ Response should include array of CHW users with stats

3. **Test Case List API**
   - While on ASHA portal
   - Find request to `/api/cases?userId=...`
   - ✅ Status should be 200 OK
   - ✅ Response time should be < 300ms
   - ✅ Response should include array of cases

4. **Test Analytics API**
   - While on ASHA portal (if analytics are loaded)
   - Find request to `/api/analytics/chw-performance`
   - ✅ Status should be 200 OK
   - ✅ Response time should be < 500ms
   - ✅ Response should include summary, byCHW, volumeTrend

5. **Test Case Review API**
   - Approve or reject a case in ASHA portal
   - Find PUT request to `/api/cases/{id}/review`
   - ✅ Status should be 200 OK
   - ✅ Response time should be < 300ms
   - ✅ Response should include updated case and audit log

---

## 🌐 TEST 4: Offline Mode

### Simulating Network Failure

1. **Open Browser DevTools**
   - Press `F12`
   - Go to "Network" tab
   - At the top, change dropdown from "Online" to "Offline"

2. **Test CHW Create Case Offline**
   - Login as CHW (while online)
   - Switch to offline mode
   - Try to create a new case
   - ✅ Should save to IndexedDB
   - ✅ Should show message: "Saved offline. Will sync when connection is restored."
   - ✅ Case should appear in "Case History" with sync indicator

3. **Test ASHA Review Case Offline**
   - Login as ASHA (while online)
   - Switch to offline mode
   - Try to approve a case
   - ✅ Should save to IndexedDB
   - ✅ Should show message: "Saved offline. Will sync when online."
   - ✅ UI should update optimistically

4. **Test Going Back Online**
   - Change network back to "Online"
   - Refresh the page
   - ✅ Offline changes should sync automatically
   - ✅ Data should be consistent across portals

---

## 📊 TEST 5: Data Consistency

### Cross-Portal Verification

1. **Create Case as CHW**
   - Login as CHW
   - Create a test case
   - Note: Case ID, Patient Name, Priority, Status

2. **Check in ASHA Portal**
   - Logout, login as ASHA
   - Find the same case
   - ✅ Patient name should match exactly
   - ✅ Priority should match
   - ✅ Status should match
   - ✅ All case details should be identical

3. **Approve in ASHA Portal**
   - Approve the case with notes
   - Note the timestamp

4. **Verify in CHW Portal**
   - Logout, login back as CHW
   - Check "Case History"
   - Find the approved case
   - ✅ Status should show "APPROVED" (green)
   - ✅ ASHA feedback should be visible
   - ✅ Approval timestamp should match

5. **Verify in Database**
   - Open Prisma Studio
   - Check Case table
   - ✅ All fields should match what's shown in both portals

---

## 🔄 TEST 6: Case Rejection Flow

### Testing Rejection Instead of Approval

1. **Create Another Test Case as CHW**
   - Login as CHW
   - Create a new case with different patient
   - Patient Name: "Jane Smith"

2. **Reject Case as ASHA**
   - Login as ASHA
   - Find Jane Smith's case
   - Click "Request Revision" or "Reject"
   - Enter rejection reason: "Need more information about symptoms duration"
   - Submit
   - ✅ Case should update to "needs_revision" or "REJECTED"

3. **Verify Rejection in CHW Portal**
   - Login back as CHW
   - Check "Case History"
   - Find Jane Smith's case
   - ✅ Status badge should be RED "REJECTED"
   - ✅ Should see red box with "❌ Rejected by ASHA"
   - ✅ Should show rejection reason
   - ✅ May see notification about rejection

---

## 🚨 TEST 7: Case Escalation Flow

### Testing Escalate to Clinic

1. **Create High-Risk Case as CHW**
   - Login as CHW
   - Create case with critical symptoms
   - Patient Name: "Emergency Patient"
   - Symptoms: fever, difficulty breathing, chest pain
   - High temperature: 104°F

2. **Escalate Case as ASHA**
   - Login as ASHA
   - Find Emergency Patient's case
   - Click "Escalate to Clinic"
   - Enter escalation reason: "Requires immediate medical attention"
   - Submit
   - ✅ Case priority should change to 5 (critical)
   - ✅ Status should show "escalated_to_clinic"

3. **Verify Escalation**
   - Check in CHW portal
   - ✅ Case should show escalated status
   - ✅ Priority badge should show high priority
   - Check database
   - ✅ Priority should be 5
   - ✅ Escalation details should be recorded

---

## 📈 TEST 8: Performance Metrics

### Verify Real Data in Analytics

1. **Login as ASHA**
   - Navigate to `/asha`
   - Wait for dashboard to fully load

2. **Check Performance Charts**
   - Scroll down to performance metrics section
   - ✅ "Case Volume" chart should show real data (not random numbers)
   - ✅ "CHW Performance" should show actual CHW names (not "Sample CHW")
   - ✅ "Accuracy Scores" should show real approval rates
   - ✅ "Community Outreach" should show actual case counts

3. **Verify Statistics**
   - Top dashboard cards
   - ✅ Numbers should match actual database counts
   - ✅ "Total Cases" = total cases in database
   - ✅ "Pending Review" = cases with PENDING status
   - ✅ "High Risk Cases" = cases with priority ≥ 75

---

## ✅ TEST CHECKLIST

Mark off each test as you complete it:

### Workflow Tests
- [ ] CHW can create case successfully
- [ ] Case appears in CHW case history
- [ ] ASHA can see newly created case
- [ ] ASHA can approve case
- [ ] CHW receives notification of approval
- [ ] CHW sees updated case status
- [ ] Case approval feedback is visible to CHW

### Database Tests
- [ ] Case status updated in database
- [ ] Audit log entry created for review
- [ ] Alert/notification created for CHW
- [ ] readAt timestamp set when notification clicked

### API Performance Tests
- [ ] GET /api/chw responds < 200ms
- [ ] GET /api/cases responds < 300ms
- [ ] PUT /api/cases/:id/review responds < 300ms
- [ ] GET /api/analytics/chw-performance responds < 500ms

### Offline Tests
- [ ] Can create case offline (saves to IndexedDB)
- [ ] Offline message displayed
- [ ] Can review case offline (saves to IndexedDB)
- [ ] Data syncs when back online

### Data Consistency Tests
- [ ] Case data matches across CHW and ASHA portals
- [ ] Database matches portal displays
- [ ] Statistics are accurate
- [ ] Timestamps are correct

### Edge Case Tests
- [ ] Case rejection flow works
- [ ] Case escalation flow works
- [ ] Multiple cases can be handled
- [ ] Notification center shows all notifications
- [ ] Mark as read works for notifications

---

## 🎯 SUCCESS CRITERIA

**All Tests Pass If:**

✅ **Workflow**: CHW → ASHA → Notification completes successfully  
✅ **Database**: All tables updated correctly with proper audit trail  
✅ **Performance**: All API calls respond within expected thresholds  
✅ **Offline**: Offline mode works with proper fallback and sync  
✅ **Consistency**: Data matches across all portals and database  
✅ **UX**: No errors, proper loading states, helpful messages  

---

## 🐛 TROUBLESHOOTING

### Common Issues

**Issue: Case doesn't appear in ASHA portal**
- Solution: Refresh the page, check filters, verify case status is PENDING

**Issue: Notification doesn't appear**
- Solution: Wait 30 seconds for polling, manually click refresh button, check if case was high priority

**Issue: API calls fail**
- Solution: Check dev server is running, verify authentication token, check browser console for errors

**Issue: Offline mode doesn't work**
- Solution: Check IndexedDB in browser DevTools, verify dataManager is initialized

**Issue: Performance is slow**
- Solution: Check database size, verify Prisma queries are optimized, check network tab for bottlenecks

---

## 📝 TESTING NOTES

**Test Date**: _______________  
**Tester**: _______________  
**Environment**: Development / Staging / Production  

**Results Summary**:
- Total Tests: 40+
- Passed: _____
- Failed: _____
- Skipped: _____

**Issues Found**:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________

---

**Happy Testing!** 🎉

If all tests pass, the system is ready for production deployment! 🚀
