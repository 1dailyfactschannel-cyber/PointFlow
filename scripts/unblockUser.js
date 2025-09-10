
const { exec } = require('child_process');

const email = 'kv@m4bank.com';

// Шаг 1: Найти пользователя и получить его ID
const findUserCommand = `firebase firestore documents:list users --filter "email == '${email}'" --limit 1`;

exec(findUserCommand, (error, stdout, stderr) => {
    if (error) {
        console.error(`Ошибка при поиске пользователя: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`Ошибка в выводе при поиске: ${stderr}`);
        return;
    }

    // Извлекаем ID пользователя из вывода
    const lines = stdout.trim().split('\n');
    if (lines.length < 2) {
        console.log(`Пользователь с email ${email} не найден.`);
        return;
    }
    const userId = lines[lines.length - 1].split(' ')[0];

    // Шаг 2: Обновить документ пользователя
    const updateUserCommand = `firebase firestore documents:update users/${userId} --data '{\"disabled\":false}'`;

    exec(updateUserCommand, (updateError, updateStdout, updateStderr) => {
        if (updateError) {
            console.error(`Ошибка при обновлении пользователя: ${updateError.message}`);
            return;
        }
        if (updateStderr) {
            console.error(`Ошибка в выводе при обновлении: ${updateStderr}`);
            return;
        }
        console.log(`Пользователь ${email} успешно разблокирован: ${updateStdout}`);
    });
});
