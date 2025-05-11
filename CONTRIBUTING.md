# Contributing to Showdown-ChatBot

This is a set of guidelines you should follow when contributing to the project **Showdown-ChatBot**.

Please read them before submitting any issuer or pull requests.

## License and forks

This project is under the [MIT](./LICENSE) license. It is a very permissive license that allows you to do anything you want with the project, including using it for commercial purposes. Feel free to use it for anything you want (You do not need to ask for permission).

The project does not offer any kind of warranty. It is developed for fun, so do not expect any issues or features being dealt with fast. If you have an urgent issue or a feature you need, it is your own responsibility. 

If you do not like anything about the project, but still want to use it and make changes under your own terms, make a **Fork** of the project.

When making custom forks, it si recommended to rename the project, to prevent confusion with the original project.

## Bug reports

If you find a bug in the project (something not working as expected, a crash, a typo), please open an [Issue](https://github.com/AgustinSRG/Showdown-ChatBot/issues).

Unless it is a critical security issue, do not contact the repository contributors directly, always make a public issue.

## Suggestions

Suggestions for new features or new options for existing features are appreciated. If you want to make a suggestion, you have 2 options:

 - Opening a [Discussion, under the **Ideas** category](https://github.com/AgustinSRG/Showdown-ChatBot/discussions/categories/ideas). 
 - Opening an [Issue](https://github.com/AgustinSRG/Showdown-ChatBot/issues).

Only use an Issue if your idea is well-defined, so it can be implemented. If your idea is very generic and you need feedback to define it, please use a discussion instead.

## Questions

If you have any questions, or need any help figuring out how to use the project, please open a [Discussion, under the **Q&A** category](https://github.com/AgustinSRG/Showdown-ChatBot/discussions/categories/q-a).

Do not use Issues to ask questions. Any question asked with an Issue may be left unanswered and the Issue closed.

## Pull Requests

If you implemented a new feature, or fixed a bug, and want to share your contribution to this repository, open a [Pull Request](https://github.com/AgustinSRG/Showdown-ChatBot/pulls).

Since pull requests require code review and take a lot of time from the collaborators, there are some **rules you must follow**:

 - A pull request **must reference an open Issue** in the repository. Before making a pull request, make sure these is an issue for it. If there is not one, you can always open it yourself.
 - Your code **must pass the linter without any errors or warnings**. The liner can be run with the command `npm test`.
 - Your code **must work**. Make sure to test it before submitting it.
 - Your code **must be complete**. Do not submit the pull request before completing the implementation.
 - Your pull request **must not change any unrelated parts of the code**. Review your code change before submitting, and revert any changes you do not want to submit.

### Tips

When making changes to the code, here are some tips you can follow:

 - This project is implemented in Javascript for Node JS (ES6). Make sure you have knowledge of this environment before making pull request with changes in the source code.
 - When you write a commit name, describe what your commit does. Do not use commit names like `Update main.js` or `Changes`.
 - If you want to make changes to the bot source code, you can find it under the [src](./src/) folder.
 - If you want to develop a new add-on, or change an existing one, make sure to work under the [add-ons](./add-ons/) folder.
 - Read the [Basic Development Guide](https://github.com/AgustinSRG/Showdown-ChatBot/wiki/Basic-Development-Guide). It may help you understand how some core features work. 

### Specially appreciated contributions

If you want to contribute, but you are not sure what to do, check the [Issues](https://github.com/AgustinSRG/Showdown-ChatBot/issues) section. The issues marked as `not interested` mean the repository owner is not interested in implementing the feature, but you can still implement it yourself, and submit it via a Pull Request.

Also, this project is very text-heavy. If you find any typos, please report them opening an [Issue](https://github.com/AgustinSRG/Showdown-ChatBot/issues) and, optionally, open a [Pull Request](https://github.com/AgustinSRG/Showdown-ChatBot/pulls) to fix them.