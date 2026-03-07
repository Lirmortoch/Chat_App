const checkChatAccess = async (request, response, next) => {
  try {
    const chat_public_id =
      request.params.chat_public_id || request.params.public_id;
    const user_id = request.user.id;

    const [access] = await postgreSql`
      SELECT cm.chat_id, cm.role
      FROM chat.chats_members cm
      JOIN chat.chats c ON cm.chat_id = c.id
      WHERE c.public_id = ${chat_public_id} 
        AND cm.user_id = ${user_id}
        AND (cm.deleted IS FALSE OR cm.deleted IS NULL)
    `;

    if (!access) {
      return response.status(403).json({
        message: "Access denied: You are not a member of this chat",
      });
    }

    request.chatInternalId = access.chat_id;
    request.userRoleInChat = access.role;

    next();
  } catch (error) {
    console.error("Middleware Error:", error);
    response
      .status(500)
      .json({ message: "Internal server error during access check" });
  }
};

const checkMessageAccess = async (request, response, next) => {
  
}

module.exports = { checkChatAccess, checkMessageAccess };