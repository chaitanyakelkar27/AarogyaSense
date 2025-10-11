# ASHA Portal - Testing Guide

## Quick Start

### 1. Server is Running
The development server is running at: **http://localhost:5175/**

### 2. Demo Credentials
```
ASHA Account:
Email:    asha@demo.com
Password: demo123

CHW Account:
Email:    chw@demo.com
Password: demo123
```

## Testing the Complete Workflow

### Step 1: Login as ASHA
1. Navigate to http://localhost:5175/
2. Login with `asha@demo.com` / `demo123`
3. You should be redirected to `/asha` (ASHA Portal)

### Step 2: Verify Data Loading
Once logged in to the ASHA portal, check:

✅ **CHW List Should Display**:
- Real CHW users from database (not hardcoded "Sample CHW" names)
- Each CHW should show actual case statistics
- Stats should include: Total Cases, Pending, Approved, Critical

✅ **Cases Should Display**:
- Real cases from database
- Case counts should match statistics
- Cases should have proper priority, status, and details

✅ **Performance Metrics Should Display**:
- Charts should show real analytics data
- Case volume trends
- CHW approval rates
- Response time trends

### Step 3: Test Case Approval Workflow

#### A. Approve a Case
1. Find a case with status "Pending Review"
2. Click on the case to open details
3. Click "Approve" button
4. Enter optional approval notes
5. Click "Confirm"

**Expected Results**:
- ✅ Loading spinner appears
- ✅ Success message: "Case approved successfully!"
- ✅ Case status changes to "Approved"
- ✅ Case disappears from pending list
- ✅ Statistics update (pending count decreases, approved count increases)

**Verify in Database**:
```sql
-- Check case status updated
SELECT id, status, priority FROM Case WHERE id = '<case_id>';

-- Check audit log created
SELECT * FROM AuditLog WHERE resource = 'case:<case_id>' ORDER BY timestamp DESC LIMIT 1;

-- Check alert created (if high priority)
SELECT * FROM Alert WHERE userId = '<chw_id>' ORDER BY createdAt DESC LIMIT 1;
```

#### B. Reject a Case
1. Find another pending case
2. Click on the case to open details
3. Click "Request Revision" or "Reject" button
4. Enter rejection reason (required)
5. Click "Confirm"

**Expected Results**:
- ✅ Loading spinner appears
- ✅ Success message: "Case rejected successfully!"
- ✅ Case status changes to "Needs Revision"
- ✅ Statistics update

#### C. Escalate a Case
1. Find a pending case
2. Click on the case to open details
3. Click "Escalate to Clinic" button
4. Enter escalation reason
5. Click "Confirm"

**Expected Results**:
- ✅ Loading spinner appears
- ✅ Success message: "Case escalated to clinic successfully!"
- ✅ Case priority updated to 5 (critical)
- ✅ Case status changes to "Escalated"
- ✅ Statistics update

### Step 4: Test Offline Fallback

#### Simulate Network Failure
1. Open browser DevTools (F12)
2. Go to Network tab
3. Select "Offline" mode
4. Try to approve/reject a case

**Expected Results**:
- ✅ Error message appears
- ✅ "Saved offline. Will sync when connection is restored." message
- ✅ Case updates stored in IndexedDB
- ✅ UI updates optimistically
- ✅ No app crash

### Step 5: Test CHW Integration

#### A. Create Case as CHW
1. Logout from ASHA account
2. Login as CHW (`chw@demo.com` / `demo123`)
3. Navigate to `/chw-new`
4. Create a new case:
   - Select patient
   - Enter symptoms
   - Capture images/audio
   - Submit case
5. Note the case ID

#### B. Verify in ASHA Portal
1. Logout from CHW account
2. Login back as ASHA (`asha@demo.com` / `demo123`)
3. Navigate to `/asha`
4. **Verify the new case appears in pending list**
5. **Verify CHW statistics updated**

#### C. Approve and Verify Notification
1. Approve the case created by CHW
2. Add approval notes
3. Submit approval

**Expected Results**:
- ✅ Case approved successfully
- ✅ Alert created in database
- ✅ CHW would receive notification (when notification system is implemented)

## API Endpoint Testing

### Using Browser DevTools

#### Test CHW List API
```javascript
// In browser console (while logged in as ASHA)
fetch('/api/chw', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
})
  .then(r => r.json())
  .then(data => console.log('CHW List:', data));
```

**Expected Response**:
```json
{
  "chws": [
    {
      "id": "...",
      "name": "CHW Name",
      "email": "chw@demo.com",
      "phone": "...",
      "location": "...",
      "totalCases": 5,
      "pendingCases": 2,
      "approvedCases": 3,
      "criticalCases": 1
    }
  ],
  "total": 1
}
```

#### Test Case Review API
```javascript
// Approve a case
fetch('/api/cases/<case_id>/review', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'approve',
    notes: 'Case reviewed and approved'
  })
})
  .then(r => r.json())
  .then(data => console.log('Review Result:', data));
```

**Expected Response**:
```json
{
  "success": true,
  "case": {
    "id": "...",
    "status": "APPROVED",
    "priority": 3,
    ...
  },
  "audit": {
    "id": "...",
    "action": "case_review",
    ...
  }
}
```

#### Test Analytics API
```javascript
// Get performance metrics
fetch('/api/analytics/chw-performance?days=7', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
})
  .then(r => r.json())
  .then(data => console.log('Analytics:', data));
```

**Expected Response**:
```json
{
  "summary": {
    "totalCases": 10,
    "pendingCases": 3,
    "approvedCases": 5,
    "rejectedCases": 2,
    "criticalCases": 1,
    "avgResponseTime": 2,
    "approvalRate": 71,
    "avgAIConfidence": 85
  },
  "byCHW": [...],
  "volumeTrend": [...],
  "dateRange": {...}
}
```

## Database Verification

### Check Database Records
```bash
# Open SQLite database
cd /home/chirag/Downloads/spark-field
npx prisma studio
```

Then verify:

1. **Case Table**:
   - Check status field updated (PENDING → APPROVED/REJECTED)
   - Check priority field for escalated cases (should be 5)
   - Check updatedAt timestamp

2. **AuditLog Table**:
   - Each review action should create an audit log
   - action = 'case_review'
   - resource = 'case:<case_id>'
   - outcome = 'success'
   - Check metadata JSON for details

3. **Alert Table**:
   - High-priority approvals create alerts
   - userId = CHW who created the case
   - type = 'case_status_update'
   - priority = case priority
   - Check channels JSON array

## Known Issues to Watch For

### Issue 1: No Cases Visible
**Symptom**: ASHA portal shows "No cases pending review"

**Possible Causes**:
- Database has no cases yet
- CHW hasn't created any cases
- Cases are filtered out by current filter

**Solution**:
- Login as CHW and create test cases
- Check filter settings in ASHA portal
- Verify database has cases: `SELECT * FROM Case;`

### Issue 2: Statistics Show Zero
**Symptom**: All statistics show 0 cases

**Possible Causes**:
- No CHW users in database
- No cases assigned to CHWs
- API endpoint returning empty data

**Solution**:
- Verify CHW users exist: `SELECT * FROM User WHERE role='CHW';`
- Check API response in DevTools Network tab
- Check server logs for errors

### Issue 3: Error Messages on Actions
**Symptom**: "Error approving case" message appears

**Possible Causes**:
- Authentication token expired
- Invalid case ID
- Database constraint violation
- Network connection issue

**Solution**:
- Check browser console for error details
- Verify localStorage has valid authToken
- Check server logs in terminal
- Try logout and login again

### Issue 4: Offline Mode Not Working
**Symptom**: App crashes when offline

**Possible Causes**:
- IndexedDB not initialized
- Try-catch block not catching error
- Fallback logic not implemented

**Solution**:
- Check browser console for IndexedDB errors
- Verify dataManager is working
- Test with Network tab throttling first

## Performance Metrics to Monitor

### Frontend Performance
- Page load time: < 2 seconds
- API call response time: < 500ms
- UI updates: < 100ms (should feel instant)
- Memory usage: < 100MB for ASHA portal

### Backend Performance
- GET /api/chw: < 200ms
- PUT /api/cases/:id/review: < 300ms
- GET /api/analytics/chw-performance: < 500ms
- Database queries: < 50ms each

## Success Criteria

✅ **Data Integration**
- [ ] CHW list loads from database (not hardcoded)
- [ ] Case statistics are accurate
- [ ] Performance metrics display real data
- [ ] Charts render without errors

✅ **Functionality**
- [ ] Approve case updates database and UI
- [ ] Reject case updates database and UI
- [ ] Escalate case sets priority to 5
- [ ] Audit logs created for all actions
- [ ] Alerts sent for high-priority approvals

✅ **User Experience**
- [ ] Loading states visible during API calls
- [ ] Success messages shown after actions
- [ ] Error messages informative and helpful
- [ ] Offline mode works with fallback
- [ ] No app crashes or blank screens

✅ **Data Consistency**
- [ ] Statistics match actual case counts
- [ ] Case status reflects latest actions
- [ ] CHW sees approved/rejected cases
- [ ] Notifications delivered to CHW

## Next Steps After Testing

1. **Fix any bugs discovered during testing**
2. **Add loading spinners and better UI feedback**
3. **Implement toast notifications**
4. **Add confirmation dialogs for critical actions**
5. **Build CHW case history view**
6. **Implement real-time notifications**

---

**Happy Testing!** 🎉

If you encounter any issues, check:
1. Server logs in terminal
2. Browser console (F12)
3. Network tab (DevTools)
4. Database records (Prisma Studio)
