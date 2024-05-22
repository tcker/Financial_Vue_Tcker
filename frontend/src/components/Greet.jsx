import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../../firebase';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function Greet() {
  const [userName, setUserName] = useState({ firstName: '', lastName: '' });
  const [photoURL, setPhotoURL] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const q = query(collection(db, 'users'), where('uid', '==', user.uid));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            // No user document found, create a new user document
            await setDoc(userDocRef, {
              uid: user.uid,
              firstName: user.displayName ? user.displayName.split(' ')[0] : 'User',
              lastName: user.displayName ? user.displayName.split(' ')[1] : '',
              photoURL: user.photoURL || '',
            });
            setUserName({
              firstName: user.displayName ? user.displayName.split(' ')[0] : 'User',
              lastName: user.displayName ? user.displayName.split(' ')[1] : '',
            });
            setPhotoURL(user.photoURL || '');
          } else {
            querySnapshot.forEach(doc => {
              const userData = doc.data();
              setUserName({ firstName: userData.firstName, lastName: userData.lastName });
              setPhotoURL(userData.photoURL || '');
            });
          }

          const storedPhotoURL = localStorage.getItem(`photoURL_${user.uid}`);
          if (storedPhotoURL) {
            setPhotoURL(storedPhotoURL);
          } else if (user.photoURL) {
            setPhotoURL(user.photoURL);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        console.log('No user is currently logged in');
        setPhotoURL('');
      }
    };

    fetchUserData();
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    const user = auth.currentUser;
    if (file && user) {
      const storageRef = ref(storage, `users/${user.uid}/${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        await setDoc(doc(db, 'users', user.uid), { photoURL: downloadURL }, { merge: true });
        setPhotoURL(downloadURL);
        // Store the profile picture URL in local storage with a unique key for each user
        localStorage.setItem(`photoURL_${user.uid}`, downloadURL);
      } catch (error) {
        console.error('Error uploading profile picture:', error);
      }
    }
  };

  return (
    <article className="px-6 py-8 w-full flex justify-between items-center">
      <div className="flex items-center">
        <h1 className="text-heading-3 leading-tight font-medium text-white">
          Good morning,
          <br />
          <span className="text-secondary text-heading-3 font-bold">
            {`${userName.firstName} ${userName.lastName}`}
          </span>
        </h1>
      </div>
      <div>
        <label htmlFor="profile-image">
          <img
            className="w-10 h-10 object-cover rounded-full cursor-pointer"
            src={photoURL || 'https://via.placeholder.com/40'}
            alt="Profile"
          />
          <input
            type="file"
            accept="image/jpeg, image/png"
            id="profile-image"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </label>
      </div>
    </article>
  );
}

export default Greet;