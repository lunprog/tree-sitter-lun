import XCTest
import SwiftTreeSitter
import TreeSitterLun

final class TreeSitterLunTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_lun())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Lun grammar")
    }
}
