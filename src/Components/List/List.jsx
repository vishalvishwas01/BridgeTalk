import UserInfo from './UserInfo/UserInfo';
import ChatList from './ChatList/ChatList'

const List = ({ setActiveView, className = "" }) => {
  return (
    <div
      className={`flex-1 flex-col w-[100dvw] lg:w-[350px] h-[100dvh] overflow-hidden lg:z-50 z-20 ${className}`}
      style={{ boxShadow: "8px 0 6px -4px rgba(0, 0, 0, 0.2)" }}
    >
        <UserInfo/>
        <ChatList setActiveView={setActiveView} />
    </div>
  )
}

export default List
