import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { initializeFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let app;
let db;

window.initCloudSync = async function() {
    try {
        const response = await fetch('/firebase-applet-config.json');
        const firebaseConfig = await response.json();
        app = initializeApp(firebaseConfig);
        db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);
    } catch(e) {
        console.error("Failed to load firebase config", e);
    }
};

window.initCloudSync();

window.syncToCloud = async function() {
    const btn = document.getElementById('btn-cloud-sync');
    if(btn) {
        btn.innerHTML = 'Uploading...';
        btn.disabled = true;
    }
    
    // Gather all local storage data
    const data = {
        settings: localStorage.getItem('gpf-settings'),
        apiKeys: localStorage.getItem('gpf-api-keys'),
        signatories: localStorage.getItem('gpf-signatories'),
        logo1: localStorage.getItem('gpf-s-logo1'),
        logo2: localStorage.getItem('gpf-s-logo2'),
        logo3: localStorage.getItem('gpf-s-logo3'),
        timestamp: new Date().toISOString()
    };
    
    // We should probably use a user ID or a shared generic ID for now since auth isn't integrated in the pure HTML app
    // Let's ask user for a "Sync PIN" or just use a generic path if they want it accessible from anywhere.
    let syncPin = document.getElementById('s-cloud-pin').value;
    if (!syncPin) {
        syncPin = 'GPF-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        document.getElementById('s-cloud-pin').value = syncPin;
    }

    try {
        await setDoc(doc(db, "gpf-cloud-sync", syncPin), data);
        if(window.toast) window.toast('✅ Successfully Synced to Cloud!');
    } catch(e) {
        console.error(e);
        if(window.toast) window.toast('❌ Cloud Sync Failed: ' + e.message, 'error');
    }
    
    if(btn) {
        btn.innerHTML = '☁️ Sync Settings to Cloud';
        btn.disabled = false;
    }
};

window.restoreFromCloud = async function() {
    const btn = document.getElementById('btn-cloud-restore');
    if(btn) {
        btn.innerHTML = 'Downloading...';
        btn.disabled = true;
    }
    
    let syncPin = document.getElementById('s-cloud-pin').value;
    if (!syncPin) {
        if(window.toast) window.toast('❌ Please enter your Sync PIN to restore', 'error');
        if(btn) {
            btn.innerHTML = '⬇️ Restore from Cloud';
            btn.disabled = false;
        }
        return;
    }
    
    try {
        const d = await getDoc(doc(db, "gpf-cloud-sync", syncPin));
        if (d.exists()) {
            const data = d.data();
            if(data.settings) localStorage.setItem('gpf-settings', data.settings);
            if(data.apiKeys) localStorage.setItem('gpf-api-keys', data.apiKeys);
            if(data.signatories) localStorage.setItem('gpf-signatories', data.signatories);
            
            if(data.logo1) localStorage.setItem('gpf-s-logo1', data.logo1); else localStorage.removeItem('gpf-s-logo1');
            if(data.logo2) localStorage.setItem('gpf-s-logo2', data.logo2); else localStorage.removeItem('gpf-s-logo2');
            if(data.logo3) localStorage.setItem('gpf-s-logo3', data.logo3); else localStorage.removeItem('gpf-s-logo3');
            
            // Reload into UI
            if(window.loadSettings) window.loadSettings();
            if(window.loadApiKeys) window.loadApiKeys();
            if(window.loadSignatories) window.loadSignatories();
            if(window.loadLogos) window.loadLogos();
            
            if(window.toast) window.toast('✅ Settings Restored from Cloud!');
        } else {
            if(window.toast) window.toast('ℹ️ No sync data found for this PIN', 'error');
        }
    } catch(e) {
        console.error(e);
        if(window.toast) window.toast('❌ Restore Failed: ' + e.message, 'error');
    }
    
    if(btn) {
        btn.innerHTML = '⬇️ Restore from Cloud';
        btn.disabled = false;
    }
};
