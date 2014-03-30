#include "hostwindow.h"

#include <QtWidgets>
#include <QtWebKitWidgets>

HostWindow::HostWindow(QWidget *parent) :
    QMainWindow(parent),
    m_settings(new QSettings(this)),
    m_view(new QWebView(this)) {

    connect(this->m_view->page()->mainFrame(),
            SIGNAL(javaScriptWindowObjectCleared()), SLOT(addToJavaScript()));

#ifdef QT_DEBUG
    this->m_view->page()->settings()->setAttribute(QWebSettings::DeveloperExtrasEnabled, true);
    this->m_inspector = new QWebInspector();
    this->m_inspector->setPage(this->m_view->page());
    this->m_inspector->show();

    this->m_view->load(QUrl(QLatin1String("http://127.0.0.1:8999/")));
#else
    this->m_view->load(QUrl(QLatin1String("file:///Users/aadam/Documents/Customers/Gravit/git/gravit/build/index.html")));
#endif
}

HostWindow::~HostWindow() {
#ifdef QT_DEBUG
    delete this->m_inspector;
#endif
}

void HostWindow::openShell() {
    QString state = this->m_settings->value("app.state").toString();
    if (state.isEmpty()) {
        // First run ever
        QRect screenGeometry = QApplication::desktop()->screenGeometry();
        this->resize(1024, 768);
        int x = (screenGeometry.width() - this->width()) / 2;
        int y = (screenGeometry.height() - this->height()) / 2;
        this->move(x, y);
        this->show();
    } else {
        this->resize(this->m_settings->value("app.size", QSize(1024, 768)).toSize());
        this->move(this->m_settings->value("app.pos", QPoint(0, 0)).toPoint());

        if (state.compare("maximized") == 0) {
            this->showMaximized();
        } else if (state.compare("fullscreen") == 0) {
            this->showFullScreen();
        } else {
            this->show();
        }
    }
}

QObject* HostWindow::addMenu(QObject* parent, const QString& title) {
    QMenu* menu = qobject_cast<QMenu*>(parent);
    if (menu) {
        return menu->addMenu(title);
    } else {
        return this->menuBar()->addMenu(title);
    }
}

QObject* HostWindow::addMenuItem(QObject* parent) {
    QMenu* menu = qobject_cast<QMenu*>(parent);
    if (menu) {
        QAction* action = menu->addAction(QString(""));
        return action;
    }
    return NULL;
}

void HostWindow::addMenuSeparator(QObject* parent) {
    QMenu* menu = qobject_cast<QMenu*>(parent);
    if (menu) {
        menu->addSeparator();
    }
}

void HostWindow::updateMenuItemShortcut(QObject* item, const QString& shortcut) {
    QAction* action = qobject_cast<QAction*>(item);
    if (action) {
        if (!shortcut.isEmpty()) {
            action->setShortcut(QKeySequence::fromString(shortcut));
        } else {
            action->setShortcut(QKeySequence());
        }
    }
}

void HostWindow::removeMenuItem(QObject* parent, QObject* item) {
    QMenu* menu = qobject_cast<QMenu*>(parent);
    QAction* action = qobject_cast<QAction*>(item);
    if (menu) {
        menu->removeAction(action);
    }
}

QString HostWindow::openFilePrompt(const QString& filter, const QString& initialDirectory) {
    return QFileDialog::getOpenFileName(this, QString(), initialDirectory, filter);
}

QString HostWindow::saveFilePrompt(const QString& filter, const QString& initialDirectory) {
    return QFileDialog::getSaveFileName(this, QString(), initialDirectory, filter);
}

QString HostWindow::readFile(const QString& fileLocation, bool binary, const QString& encoding) {
    QFile file(fileLocation);

    if (!file.open(QIODevice::ReadOnly))
    {
        return false;
    }

    QByteArray fileContents = file.readAll();
    file.close();

    if (encoding.compare("binary") == 0) {
        fileContents = qUncompress(fileContents);
    }

    QString result;
    if (binary) {
        result = QString::fromLocal8Bit(fileContents.toBase64());
    } else {
        result = QString::fromUtf8(fileContents);
    }

    return result;
}

bool HostWindow::writeFile(const QString& fileLocation, const QString& data, bool binary, const QString& encoding) {
    QFile file(fileLocation);

    if (!file.open(QIODevice::WriteOnly))
    {
        return false;
    }

    QByteArray fileContents;
    if (binary) {
        fileContents = QByteArray::fromBase64(data.toLocal8Bit());
    } else {
        fileContents = data.toUtf8();
        if (encoding.compare("binary") == 0) {
            fileContents = qCompress(fileContents, 9);
        }
    }

    file.write(fileContents);
    file.close();

    return true;
}

void HostWindow::registerShortcut(const QString& shortcut, QVariant action) {
    // TODO : Implement this
}

void HostWindow::resizeEvent(QResizeEvent* event) {
    this->m_view->move(0, 0);
    this->m_view->resize(this->size());
    event->accept();
}

void HostWindow::closeEvent(QCloseEvent *event) {
    // TODO : Ask app for closing and if denied, ignore event and stop here
    event->accept();

    if (!this->isMaximized() && !this->isMinimized()) {
        this->m_settings->setValue("app.size", this->size());
        this->m_settings->setValue("app.pos", this->pos());
    }

    if (this->isMaximized()) {
        this->m_settings->setValue("app.state", "maximized");
    } else if (this->isFullScreen()) {
        this->m_settings->setValue("app.state", "fullscreen");
    } else {
        this->m_settings->setValue("app.state", "normal");
    }
}

void HostWindow::addToJavaScript()
{
    this->m_view->page()->mainFrame()->addToJavaScriptWindowObject("gHost", this);
}
