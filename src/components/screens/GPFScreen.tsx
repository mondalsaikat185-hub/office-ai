import React, { useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';

export default function GPFScreen() {
    const { workspaces, activeWorkspaceId } = useStore();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const ws = workspaces.find(w => w.id === activeWorkspaceId);
        if (ws && ws.letterhead && iframeRef.current?.contentWindow) {
            // Give iframe a moment to load
            setTimeout(() => {
                iframeRef.current?.contentWindow?.postMessage({
                    type: 'SET_LETTERHEAD',
                    payload: ws.letterhead
                }, '*');
            }, 1000);
        }
    }, [workspaces, activeWorkspaceId]);

    return (
        <div className="w-full h-[calc(100vh-80px)]">
            <iframe 
                ref={iframeRef}
                src="/gpf/index.html" 
                className="w-full h-full border-0" 
                title="GPF Withdrawal Tool"
            />
        </div>
    );
}
