import { useParams } from 'react-router';
import { ChatPanel } from '@/pages/chat/chat-panel';
import { useChat } from '@/pages/chat/hooks/use-chat';
import { SessionSidebar } from '@/pages/chat/session-sidebar';

export default function ChatPage() {
  const { sessionId } = useParams();
  const parsed = sessionId ? Number(sessionId) : undefined;
  const chat = useChat(parsed);

  return (
    <div className="flex h-full min-h-0">
      <SessionSidebar
        datasets={chat.datasets}
        selectedDatasetId={chat.datasetId}
        sessions={chat.visibleSessions}
        activeSessionId={chat.activeId}
        canCreateSession={chat.canCreateSession}
        onSelectDataset={chat.selectDataset}
        onSelectSession={chat.selectSession}
        onCreateSession={() => void chat.createAndSelect()}
        onRenameSession={chat.renameSession}
      />
      <ChatPanel
        datasetName={chat.datasetName}
        sessionTitle={chat.sessionTitle}
        messages={chat.messages}
        draft={chat.draft}
        isStreaming={chat.streaming}
        canSend={chat.canSend}
        onDraft={chat.setDraft}
        onSend={() => void chat.send()}
        onStop={chat.stop}
      />
    </div>
  );
}
