import { Message, MessageReaction, User } from "discord.js";
import { utils } from "../utils/utils";

module.exports = {
    name: "messageCreate",
    async execute(message: Message) {
        if (utils.isAnswer(message)) {
            const question_message = await message.fetchReference();
            const manager_message = await message.channel.messages.fetch(
                await utils.getManager(question_message.id)
            )
            const user = manager_message.content.split("\n")[0].split(" ")[2];
            const reply_message = await utils.answerReply(message, user);

            const filter = (reaction: MessageReaction, author: User) => {
                return (
                    ["❔", "✅"].includes(reaction.emoji.name ?? "") &&
                    utils.userString(author.id) === user
                );
            };

            reply_message
                .awaitReactions({
                    filter,
                    max: 1,
                    time: 30000,
                    errors: ["time"],
                })
                .then((collected) => {
                    const reaction: MessageReaction = collected.last() as MessageReaction;
                    if (reaction.emoji.name === "❔") {
                        reply_message.reply(
                            `${utils.userString(message.author.id)} is still confused.`
                        );
                        reply_message.delete().catch(console.error);
                    } else if (reaction.emoji.name === "✅") {
                        const solved_question = manager_message.content
                            .replace("Question from", "**Solved** question from")
                            .concat(`\n- Goto ${message.url}, to view an answer`);

                        manager_message.edit(solved_question);
                        manager_message.suppressEmbeds(true);

                        utils.addSolved(manager_message.id, message.content);

                        reply_message.delete().catch(console.error);
                    } else {
                        reply_message.reply(`Invalid choice.`);
                    }
                })
                .catch(() => {
                    utils.noReactionHandler(manager_message, reply_message);
                });
        }
    },
};
