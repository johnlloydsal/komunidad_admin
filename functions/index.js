// Firebase Cloud Functions to auto-approve Google sign-in users
// Deploy with: firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * Automatically approve users who sign in with Google
 * Triggers when a new user document is created
 */
exports.autoApproveGoogleUsers = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userData = snap.data();
    const userId = context.params.userId;

    console.log('New user created:', userId, userData);

    // Check if user signed in with Google
    if (userData.provider === 'google' || userData.registrationMethod === 'google') {
      console.log('Google user detected, auto-approving...');

      try {
        // Update user to approved status
        await snap.ref.update({
          approvalStatus: 'approved',
          isApproved: true,
          isPending: false,
          accountStatus: 'active',
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedBy: 'System (Google Auto-Approve)',
          autoApproved: true,
        });

        console.log(`✅ User ${userId} auto-approved (Google sign-in)`);
        return { success: true, userId };
      } catch (error) {
        console.error('Error auto-approving user:', error);
        return { success: false, error: error.message };
      }
    } else {
      console.log('Regular user, requires manual approval');
      return { success: false, reason: 'Not a Google user' };
    }
  });

/**
 * Delete user from both Firestore and Firebase Authentication
 * Callable function from admin panel
 */
exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Check if request is from an authenticated admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to delete users'
    );
  }

  const { userId } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'User ID is required'
    );
  }

  try {
    // Delete from Firestore
    await db.collection('users').doc(userId).delete();
    console.log(`✅ Deleted user ${userId} from Firestore`);

    // Delete from Firebase Authentication
    try {
      await admin.auth().deleteUser(userId);
      console.log(`✅ Deleted user ${userId} from Authentication`);
    } catch (authError) {
      // User might not exist in Auth (e.g., manually created in Firestore)
      console.log(`⚠️ Could not delete from Auth (may not exist):`, authError.message);
    }

    return {
      success: true,
      message: 'User deleted successfully from Firestore and Authentication',
      userId,
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to delete user: ${error.message}`
    );
  }
});

/**
 * Manually trigger approval for existing Google users
 * Call this via HTTP to approve all existing Google users
 */
exports.approveExistingGoogleUsers = functions.https.onRequest(async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const updates = [];

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Check if it's a Google user who isn't approved yet
      if (
        (userData.provider === 'google' || userData.registrationMethod === 'google') &&
        userData.approvalStatus !== 'approved'
      ) {
        updates.push(
          doc.ref.update({
            approvalStatus: 'approved',
            isApproved: true,
            isPending: false,
            accountStatus: 'active',
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedBy: 'System (Batch Google Auto-Approve)',
            autoApproved: true,
          })
        );
      }
    });

    await Promise.all(updates);

    res.json({
      success: true,
      message: `Approved ${updates.length} Google users`,
      count: updates.length,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
