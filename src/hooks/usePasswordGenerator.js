import { ref } from 'vue';

export const usePasswordGenerator = () => {
  const length = ref(32);
  const includeUppercase = ref(true);
  const includeNumbers = ref(true);
  const includeSymbols = ref(true);

  const generatePassword = () => {
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    let characterPool = lowercaseChars;

    if (includeUppercase.value) {
      characterPool += uppercaseChars;
    }

    if (includeNumbers.value) {
      characterPool += numberChars;
    }

    if (includeSymbols.value) {
      characterPool += symbolChars;
    }

    let generatedPassword = '';
    for (let i = 0; i < length.value; i++) {
      const randomIndex = Math.floor(Math.random() * characterPool.length);
      generatedPassword += characterPool[randomIndex];
    }

    return generatedPassword
  };

  return {
    length,
    includeUppercase,
    includeNumbers,
    includeSymbols,
    generatePassword,
  };
}
